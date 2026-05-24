-- ============================================================
-- FIX: Trigger con manejo de excepciones + política de bypass
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Reemplazar el trigger con manejo de errores robusto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.usuarios (id, nombre, email, rol)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
      NEW.email,
      'comentario'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Si falla el insert, no cancelar la creación del usuario
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Dar permisos al rol "authenticated" y "anon" para insertar en usuarios
-- (El trigger corre como postgres/service_role con SECURITY DEFINER, esto es solo por si acaso)
GRANT INSERT ON public.usuarios TO service_role;
GRANT SELECT, UPDATE ON public.usuarios TO authenticated;
GRANT SELECT ON public.usuarios TO anon;

-- 3. Eliminar política de insert anterior que podría estar bloqueando el trigger
DROP POLICY IF EXISTS "insert_self" ON public.usuarios;

-- 4. Nueva política de insert: permite insertar solo cuando el id coincide con auth.uid()
-- O cuando no hay sesión activa (para el trigger del sistema)
CREATE POLICY "insert_self" ON public.usuarios
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR auth.uid() IS NULL
  );

-- 5. Si los usuarios ya existen en auth.users pero no en public.usuarios,
-- insertarlos manualmente (backfill):
INSERT INTO public.usuarios (id, nombre, email, rol)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'nombre', 'Usuario Nuevo') as nombre,
  au.email,
  'comentario' as rol
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.usuarios pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
