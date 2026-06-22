-- =============================================================================
-- MIGRACIÓN: Agregar fechas de disponibilidad a tasks
-- Agrega inicio_habilitado y fin_habilitado para controlar disponibilidad
-- =============================================================================

-- 1. Agregar columnas de fechas de disponibilidad
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS inicio_habilitado timestamp with time zone,
ADD COLUMN IF NOT EXISTS fin_habilitado timestamp with time zone;

-- 2. Crear función para actualizar is_active basado en fechas
CREATE OR REPLACE FUNCTION update_task_active_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay fechas definidas, actualizar is_active basado en la fecha actual
    IF NEW.inicio_habilitado IS NOT NULL AND NEW.fin_habilitado IS NOT NULL THEN
        IF NOW() >= NEW.inicio_habilitado AND NOW() <= NEW.fin_habilitado THEN
            NEW.is_active := true;
        ELSE
            NEW.is_active := false;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger que ejecute la función antes de INSERT o UPDATE
DROP TRIGGER IF EXISTS trigger_update_task_active_status ON public.tasks;
CREATE TRIGGER trigger_update_task_active_status
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_active_status();

-- 4. Actualizar registros existentes basado en fechas (si tienen fechas definidas)
UPDATE public.tasks
SET is_active = CASE
    WHEN inicio_habilitado IS NOT NULL 
         AND fin_habilitado IS NOT NULL 
         AND NOW() >= inicio_habilitado 
         AND NOW() <= fin_habilitado 
    THEN true
    WHEN inicio_habilitado IS NOT NULL 
         AND fin_habilitado IS NOT NULL 
    THEN false
    ELSE is_active  -- Mantener el valor actual si no hay fechas
END
WHERE inicio_habilitado IS NOT NULL OR fin_habilitado IS NOT NULL;

-- 5. Crear función para actualizar todas las tareas basado en fechas (útil para ejecutar periódicamente)
CREATE OR REPLACE FUNCTION refresh_all_tasks_active_status()
RETURNS void AS $$
BEGIN
    UPDATE public.tasks
    SET is_active = CASE
        WHEN inicio_habilitado IS NOT NULL 
             AND fin_habilitado IS NOT NULL 
             AND NOW() >= inicio_habilitado 
             AND NOW() <= fin_habilitado 
        THEN true
        WHEN inicio_habilitado IS NOT NULL 
             AND fin_habilitado IS NOT NULL 
        THEN false
        ELSE is_active  -- Mantener el valor actual si no hay fechas
    END
    WHERE inicio_habilitado IS NOT NULL OR fin_habilitado IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentarios para documentación
COMMENT ON COLUMN public.tasks.inicio_habilitado IS 
'Fecha y hora de inicio en que el video estará disponible. Si es NULL, no hay restricción de inicio.';

COMMENT ON COLUMN public.tasks.fin_habilitado IS 
'Fecha y hora de fin en que el video estará disponible. Si es NULL, no hay restricción de fin.';

COMMENT ON FUNCTION refresh_all_tasks_active_status() IS 
'Función para actualizar el estado is_active de todas las tareas basado en las fechas actuales. Útil para ejecutar periódicamente con un cron job.';
