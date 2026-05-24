-- ============================================================================
-- PORTAL CULTURAL INDÍGENA - SUPABASE FULL DATABASE SETUP & RLS FIX
-- Ejecuta este script completo en el SQL Editor de tu proyecto de Supabase.
-- ============================================================================

-- ============================================================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS QUE DEPENDEN DE LA COLUMNA "rol"
-- PostgreSQL impide alterar el tipo de dato de una columna si hay políticas RLS
-- activas que hagan referencia a ella. Las eliminamos primero para limpiar dependencias.
-- ============================================================================

-- --- POLÍTICAS DE LA TABLA usuarios ---
DROP POLICY IF EXISTS "select_self" ON public.usuarios;
DROP POLICY IF EXISTS "select_moderador_admin" ON public.usuarios;
DROP POLICY IF EXISTS "insert_self" ON public.usuarios;
DROP POLICY IF EXISTS "update_role_by_moderador_admin" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios visibles para todos" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios pueden editarse a sí mismos" ON public.usuarios;

-- --- POLÍTICAS DE LA TABLA solicitudes_rol ---
DROP POLICY IF EXISTS "select_self_sol" ON public.solicitudes_rol;
DROP POLICY IF EXISTS "insert_self_sol" ON public.solicitudes_rol;
DROP POLICY IF EXISTS "select_mod_admin_sol" ON public.solicitudes_rol;
DROP POLICY IF EXISTS "update_mod_admin_sol" ON public.solicitudes_rol;
DROP POLICY IF EXISTS "select_self" ON public.solicitudes_rol;
DROP POLICY IF EXISTS "insert_self" ON public.solicitudes_rol;
DROP POLICY IF EXISTS "update_moderator" ON public.solicitudes_rol;

-- --- POLÍTICAS DE LA TABLA articulos ---
DROP POLICY IF EXISTS "select_published" ON public.articulos;
DROP POLICY IF EXISTS "select_pending_moderator" ON public.articulos;
DROP POLICY IF EXISTS "update_moderator" ON public.articulos;
DROP POLICY IF EXISTS "insert_writer" ON public.articulos;
DROP POLICY IF EXISTS "insert_any_authenticated" ON public.articulos;

-- ============================================================================
-- PASO 2: ALTERAR LA COLUMNA "rol" DE ENUM A TEXT DE FORMA SEGURA
-- ============================================================================
ALTER TABLE public.usuarios ALTER COLUMN rol DROP DEFAULT;
ALTER TABLE public.usuarios ALTER COLUMN rol TYPE text USING rol::text;
ALTER TABLE public.usuarios ALTER COLUMN rol SET DEFAULT 'comentario';

-- ============================================================================
-- PASO 3: CREAR TABLA DE USUARIOS (Si no existía previamente)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT 'Usuario Nuevo',
  email text NOT NULL,
  rol text NOT NULL DEFAULT 'comentario',
  created_at timestamptz DEFAULT now()
);

-- Asegurar columnas necesarias en usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS fecha_registro timestamptz DEFAULT now();

-- ============================================================================
-- PASO 4: CREAR / ACTUALIZAR TABLA DE SOLICITUDES DE ROL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.solicitudes_rol (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  requested_role text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',  -- pendiente | aprobado | rechazado
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON public.solicitudes_rol(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_user   ON public.solicitudes_rol(user_id);

-- ============================================================================
-- PASO 5: CREAR FUNCIONES AUXILIARES CON 'SECURITY DEFINER'
-- Bypassean RLS internamente para evitar recursión infinita en las políticas.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.es_moderador_o_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = user_id AND rol IN ('moderador', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.es_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = user_id AND rol = 'admin'
  );
END;
$$;

-- Dar permisos de ejecución para roles autenticados y anónimos
GRANT EXECUTE ON FUNCTION public.es_moderador_o_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.es_admin(uuid) TO authenticated, anon;

-- ============================================================================
-- PASO 6: CREACIÓN Y APLICACIÓN DE LAS NUEVAS POLÍTICAS RLS (Recursión Corregida)
-- ============================================================================

-- Habilitar RLS en tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;

-- --- POLÍTICAS DE LA TABLA: usuarios ---

-- Cualquier usuario puede leer su propio perfil/rol
CREATE POLICY "select_self" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

-- Moderadores y administradores pueden leer todos los perfiles de usuario
CREATE POLICY "select_moderador_admin" ON public.usuarios
  FOR SELECT USING (public.es_moderador_o_admin(auth.uid()));

-- Permite la inserción del propio usuario (esencial para el trigger y registro manual)
CREATE POLICY "insert_self" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Moderadores y admins pueden actualizar el rol o datos de cualquier usuario
CREATE POLICY "update_role_by_moderador_admin" ON public.usuarios
  FOR UPDATE USING (public.es_moderador_o_admin(auth.uid()));


-- --- POLÍTICAS DE LA TABLA: solicitudes_rol ---

-- Los usuarios pueden ver sus propias solicitudes de rol
CREATE POLICY "select_self_sol" ON public.solicitudes_rol
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios pueden insertar sus propias solicitudes de rol
CREATE POLICY "insert_self_sol" ON public.solicitudes_rol
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los moderadores y admins pueden ver todas las solicitudes
CREATE POLICY "select_mod_admin_sol" ON public.solicitudes_rol
  FOR SELECT USING (public.es_moderador_o_admin(auth.uid()));

-- Los moderadores y admins pueden aprobar/rechazar solicitudes de rol
CREATE POLICY "update_mod_admin_sol" ON public.solicitudes_rol
  FOR UPDATE USING (public.es_moderador_o_admin(auth.uid()));


-- --- POLÍTICAS DE LA TABLA: articulos ---

-- Cualquiera (incluidos visitantes) puede ver artículos aprobados
CREATE POLICY "select_published" ON public.articulos
  FOR SELECT USING (estado = 'aprobado');

-- Solo moderadores y admins pueden ver artículos pendientes, borradores o rechazados
CREATE POLICY "select_pending_moderator" ON public.articulos
  FOR SELECT USING (
    estado IN ('pendiente', 'borrador', 'rechazado')
    AND public.es_moderador_o_admin(auth.uid())
  );

-- Cualquier usuario autenticado puede proponer (insertar) un artículo
CREATE POLICY "insert_any_authenticated" ON public.articulos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Solo moderadores y admins pueden editar o cambiar el estado de los artículos
CREATE POLICY "update_moderator" ON public.articulos
  FOR UPDATE USING (public.es_moderador_o_admin(auth.uid()));


-- ============================================================================
-- PASO 7: TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFIL EN REGISTROS
-- ============================================================================
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
    -- Evita que un error en el trigger impida la creación de la cuenta en auth.users
    RAISE WARNING 'Error en handle_new_user trigger: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Recrear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PASO 8: RELLENAR MANUALMENTE USUARIOS FALTANTES (BACKFILL)
-- ============================================================================
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
