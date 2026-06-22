-- =============================================================================
-- FIX: Hacer attention_level nullable en activity_sessions
-- Permite iniciar sesiones sin attention_level (se establece al finalizar)
-- =============================================================================

-- Hacer attention_level nullable
ALTER TABLE public.activity_sessions
ALTER COLUMN attention_level DROP NOT NULL;

-- Comentario actualizado
COMMENT ON COLUMN public.activity_sessions.attention_level IS 
'Nivel de atención calculado en el frontend al finalizar: alto (>=0.7), medio (>=0.4), bajo (<0.4). NULL mientras la sesión está en progreso.';
