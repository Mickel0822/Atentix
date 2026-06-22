-- Migración: Hacer duration_seconds nullable en la tabla tasks
-- Esto permite que el campo sea NULL si no se puede obtener la duración del video

-- Verificar si la columna existe y si no acepta NULL
DO $$
BEGIN
    -- Si la columna existe pero no acepta NULL, alterarla
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'duration_seconds'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE tasks ALTER COLUMN duration_seconds DROP NOT NULL;
        RAISE NOTICE 'Columna duration_seconds actualizada para aceptar NULL';
    ELSE
        RAISE NOTICE 'La columna duration_seconds ya acepta NULL o no existe';
    END IF;
END $$;
