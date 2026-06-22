-- =============================================================================
-- SCRIPT DE CONFIGURACIÓN DE STORAGE (Permisos de Archivos)
-- Ejecuta esto en el SQL Editor de Supabase para arreglar la subida de videos.
-- =============================================================================

-- 1. Crear el bucket 'videos' si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS en la tabla de objetos (si no estaba)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR POLÍTICAS ANTIGUAS (Para evitar conflictos al crear las nuevas)
DROP POLICY IF EXISTS "Public Videos Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Videos Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Videos Update" ON storage.objects;

-- 4. CREAR NUEVAS POLÍTICAS "TODO PÚBLICO" (Para la demo)

-- Permitir que CUALQUIERA vea los videos (Necesario para el reproductor del estudiante)
CREATE POLICY "Public Videos Select" ON storage.objects
FOR SELECT USING ( bucket_id = 'videos' );

-- Permitir que CUALQUIERA suba videos (Necesario para el backend "anonimo")
CREATE POLICY "Public Videos Insert" ON storage.objects
FOR INSERT WITH CHECK ( bucket_id = 'videos' );

-- Permitir actualizaciones (opcional)
CREATE POLICY "Public Videos Update" ON storage.objects
FOR UPDATE USING ( bucket_id = 'videos' );

-- Mensaje de éxito (solo visible si corres esto como script)
-- select 'Permisos de Storage configurados correctamente' as status;
