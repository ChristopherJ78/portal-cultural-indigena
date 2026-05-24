-- ============================================================
-- PASO 1: Crear enum de roles (ejecutar primero si no existe)
-- ============================================================
-- Si ya existe el tipo, comenta esta línea:
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('comentario', 'redactor', 'moderador', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- PASO 2: Crear tabla de usuarios (si no existe)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT 'Usuario Nuevo',
  email text NOT NULL,
  rol rol_usuario NOT NULL DEFAULT 'comentario',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PASO 3: Crear tabla solicitudes_rol (si no existe)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitudes_rol (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  requested_role text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',  -- pendiente | aprobado | rechazado
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON public.solicitudes_rol(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_user   ON public.solicitudes_rol(user_id);

-- ============================================================
-- PASO 4: Habilitar RLS en todas las tablas
-- ============================================================
ALTER TABLE public.usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_rol ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASO 5: Políticas RLS para public.usuarios
-- ============================================================
-- Eliminar políticas previas para evitar duplicados
DROP POLICY IF EXISTS "select_self"                ON public.usuarios;
DROP POLICY IF EXISTS "insert_self"               ON public.usuarios;
DROP POLICY IF EXISTS "select_moderador_admin"    ON public.usuarios;
DROP POLICY IF EXISTS "update_role_by_moderador_admin" ON public.usuarios;

-- Cada usuario puede leer SU propio registro
CREATE POLICY "select_self" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

-- Moderadores y admins pueden leer TODOS los usuarios
CREATE POLICY "select_moderador_admin" ON public.usuarios
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.usuarios WHERE rol IN ('moderador', 'admin')
    )
  );

-- Trigger puede insertar (SECURITY DEFINER en la función lo permite)
CREATE POLICY "insert_self" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Moderadores y admins pueden actualizar el rol de cualquier usuario
CREATE POLICY "update_role_by_moderador_admin" ON public.usuarios
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.usuarios WHERE rol IN ('moderador', 'admin')
    )
  );

-- ============================================================
-- PASO 6: Políticas RLS para public.solicitudes_rol
-- ============================================================
DROP POLICY IF EXISTS "select_self_sol"      ON public.solicitudes_rol;
DROP POLICY IF EXISTS "insert_self_sol"      ON public.solicitudes_rol;
DROP POLICY IF EXISTS "select_mod_admin_sol" ON public.solicitudes_rol;
DROP POLICY IF EXISTS "update_mod_admin_sol" ON public.solicitudes_rol;

-- El propio usuario puede ver sus solicitudes
CREATE POLICY "select_self_sol" ON public.solicitudes_rol
  FOR SELECT USING (auth.uid() = user_id);

-- El propio usuario puede crear solicitudes
CREATE POLICY "insert_self_sol" ON public.solicitudes_rol
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Moderadores y admins pueden ver TODAS las solicitudes
CREATE POLICY "select_mod_admin_sol" ON public.solicitudes_rol
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.usuarios WHERE rol IN ('moderador', 'admin')
    )
  );

-- Moderadores y admins pueden actualizar el estado de las solicitudes
CREATE POLICY "update_mod_admin_sol" ON public.solicitudes_rol
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.usuarios WHERE rol IN ('moderador', 'admin')
    )
  );

-- ============================================================
-- PASO 7: Trigger para sincronizar auth.users → public.usuarios
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario Nuevo'),
    NEW.email,
    'comentario'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
