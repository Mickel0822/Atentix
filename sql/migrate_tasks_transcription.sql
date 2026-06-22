-- =============================================================================
-- MIGRACIÓN: Simplificar tabla tasks
-- Elimina video_summary y renombra video_transcript a transcription
-- =============================================================================

-- 1. Renombrar video_transcript a transcription (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'video_transcript'
    ) THEN
        ALTER TABLE public.tasks 
        RENAME COLUMN video_transcript TO transcription;
        RAISE NOTICE 'Columna video_transcript renombrada a transcription';
    ELSE
        RAISE NOTICE 'La columna video_transcript no existe';
    END IF;
END $$;

-- 2. Eliminar columna video_summary (si existe)
ALTER TABLE public.tasks 
DROP COLUMN IF EXISTS video_summary;

-- 3. Comentario para documentación
COMMENT ON COLUMN public.tasks.transcription IS 
'Transcripción completa del video generada por Whisper';
