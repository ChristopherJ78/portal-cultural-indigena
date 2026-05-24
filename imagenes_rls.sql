-- ============================================================================
-- PORTAL CULTURAL INDÍGENA - SUPABASE IMAGENES TABLE RLS & CLEANUP
-- Ejecuta este script en el SQL Editor de Supabase si usas adjuntar imágenes.
-- ============================================================================

-- 1. Habilitar RLS en la tabla de imágenes
ALTER TABLE public.imagenes ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar políticas previas para evitar duplicados
DROP POLICY IF EXISTS "select_public_imagenes" ON public.imagenes;
DROP POLICY IF EXISTS "insert_authenticated_imagenes" ON public.imagenes;
DROP POLICY IF EXISTS "delete_moderator_admin_imagenes" ON public.imagenes;

-- 3. Crear políticas RLS

-- Cualquier persona (incluso visitantes) puede ver las imágenes adjuntas
CREATE POLICY "select_public_imagenes" ON public.imagenes
  FOR SELECT USING (true);

-- Cualquier usuario autenticado puede subir/registrar imágenes
CREATE POLICY "insert_authenticated_imagenes" ON public.imagenes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Solo moderadores y admins pueden actualizar o eliminar imágenes
CREATE POLICY "delete_moderator_admin_imagenes" ON public.imagenes
  FOR ALL USING (public.es_moderador_o_admin(auth.uid()));
