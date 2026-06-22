-- =============================================================================
-- MIGRACIÓN: Simplificar activity_sessions
-- Elimina attention_score_avg y attention_data, agrega attention_level
-- =============================================================================

-- 1. Agregar nueva columna attention_level
ALTER TABLE public.activity_sessions 
ADD COLUMN IF NOT EXISTS attention_level text;

-- 2. Migrar datos existentes: convertir attention_score_avg a attention_level
-- Solo si la columna attention_score_avg existe
DO $$
BEGIN
    -- Verificar si la columna attention_score_avg existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_sessions' 
        AND column_name = 'attention_score_avg'
    ) THEN
        -- Migrar datos existentes
        UPDATE public.activity_sessions
        SET attention_level = CASE
            WHEN attention_score_avg >= 0.7 THEN 'alto'
            WHEN attention_score_avg >= 0.4 THEN 'medio'
            WHEN attention_score_avg < 0.4 THEN 'bajo'
            ELSE 'medio' -- Default para valores NULL
        END
        WHERE attention_score_avg IS NOT NULL;
        
        RAISE NOTICE 'Datos migrados desde attention_score_avg';
    ELSE
        RAISE NOTICE 'La columna attention_score_avg no existe, saltando migración de datos';
    END IF;
END $$;

-- 3. Establecer default para registros sin atención calculada
UPDATE public.activity_sessions
SET attention_level = 'medio'
WHERE attention_level IS NULL;

-- 4. Agregar constraint CHECK para validar valores (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activity_sessions_attention_level_check'
    ) THEN
        ALTER TABLE public.activity_sessions
        ADD CONSTRAINT activity_sessions_attention_level_check 
        CHECK (attention_level IN ('alto', 'medio', 'bajo'));
    END IF;
END $$;

-- 5. Hacer la columna NOT NULL después de migrar datos (solo si no es ya NOT NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_sessions' 
        AND column_name = 'attention_level'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.activity_sessions
        ALTER COLUMN attention_level SET NOT NULL;
        RAISE NOTICE 'Columna attention_level establecida como NOT NULL';
    ELSE
        RAISE NOTICE 'La columna attention_level ya es NOT NULL o no existe';
    END IF;
END $$;

-- 6. Eliminar columnas antiguas (solo si existen)
ALTER TABLE public.activity_sessions 
DROP COLUMN IF EXISTS attention_score_avg;

ALTER TABLE public.activity_sessions 
DROP COLUMN IF EXISTS attention_data;

-- 7. Comentario para documentación
COMMENT ON COLUMN public.activity_sessions.attention_level IS 
'Nivel de atención calculado en el frontend: alto (>=0.7), medio (>=0.4), bajo (<0.4)';
