-- =============================================================================
-- SCRIPT DE CORRECCIÓN DE PERMISOS (FIX RLS)
-- Permite que el Backend (conectado sin usuario/anon) pueda escribir datos.
-- =============================================================================

-- 1. Habilitar inserción/modificación pública en 'tasks' (Para subir videos)
CREATE POLICY "Permitir Insertar Tareas Publicamente" ON tasks
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir Modificar Tareas Publicamente" ON tasks
FOR UPDATE USING (true);

-- 2. Habilitar inserción pública en 'classes' (Para crear clases)
CREATE POLICY "Permitir Insertar Clases Publicamente" ON classes
FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir Modificar Clases Publicamente" ON classes
FOR UPDATE USING (true);


-- 3. Habilitar permisos para sesiones y cuestionarios (Para el flujo del estudiante)
CREATE POLICY "Permitir Sesiones Publicas" ON activity_sessions
FOR ALL USING (true);

CREATE POLICY "Permitir Cuestionarios Publicos" ON generated_quizzes
FOR ALL USING (true);

-- 4. Asegurar lectura pública de perfiles (necesario para buscar profesor)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura Publica Perfiles" ON profiles
FOR SELECT USING (true);

-- Nota: Estas políticas hacen que la BD sea "abierta" para facilitar la demo.
-- En producción real, el backend debería usar la SERVICE_ROLE_KEY.
