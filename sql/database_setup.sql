-- =============================================================================
-- SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS - SISTEMA DE DETECCIÓN DE ATENCIÓN
-- =============================================================================
-- Este script adapta el esquema relacional propuesto Para trabajar nativamente
-- con Supabase Auth y la tabla 'profiles' existente.
-- Se usan UUIDs para usuarios (estándar de Supabase) y snake_case para convenciones.

-- 1. CONFIGURACIÓN DE ROLES
-- Creamos la tabla de roles para dar sentido a los IDs 1, 2, 3 que ya usas.
create table if not exists roles (
  id int primary key,
  name text not null
);

-- Insertamos los roles por defecto si no existen
insert into roles (id, name) values 
  (1, 'administrador'), 
  (2, 'profesor'), 
  (3, 'estudiante')
on conflict (id) do nothing;

-- 2. INTEGRACIÓN CON PROFILES (Existente)
-- Aseguramos que la tabla profiles tenga la restricción de clave foránea correcta.
-- Nota: Asumimos que 'profiles.user_id' ya es FK a 'auth.users'.
-- Si 'profiles.role' es un entero, lo vinculamos a nuestra nueva tabla roles.
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'profiles_role_fkey') then
    alter table profiles 
    add constraint profiles_role_fkey 
    foreign key (role) references roles(id);
  end if;
end $$;

-- 3. CLASES (Equivalente a 'Clase')
-- Las clases son creadas por profesores.
create table if not exists classes (
  id uuid default gen_random_uuid() primary key,
  professor_id uuid references profiles(user_id) not null,
  name text not null,          -- 'clase_nom'
  description text,            -- 'clase_descr'
  code text unique,            -- 'clase_cod' (para unirse)
  schedule text,               -- 'clase_horario'
  is_active boolean default true, -- 'clase_habil'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. INSCRIPCIONES (Equivalente a 'inscritos_clase')
-- Relaciona estudiantes con clases.
create table if not exists class_enrollments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(user_id) on delete cascade,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  unique(class_id, student_id) -- Un estudiante no se puede inscribir dos veces a la misma clase
);

-- 5. TAREAS / VIDEOS (Equivalente a 'Tareas' + 'videos')
-- Representa un video asignado dentro de una clase.
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references classes(id) on delete cascade,
  title text not null,         -- 'tarea_nom'
  description text,            -- 'tarea_des'
  video_url text not null,     -- 'tarea_video_url' (Ruta en Supabase Storage)
  
  -- Campo para IA
  transcription text,          -- Transcripción completa del video
  
  duration_seconds int null,  -- 'tarea_duracion' (duración en segundos, puede ser null si no se puede obtener)
  is_active boolean default true, -- 'tarea_habil' (actualizado automáticamente por trigger)
  
  -- Fechas de disponibilidad
  inicio_habilitado timestamp with time zone,  -- Fecha/hora de inicio de disponibilidad
  fin_habilitado timestamp with time zone,       -- Fecha/hora de fin de disponibilidad
  
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. SESIONES DE ACTIVIDAD (Equivalente a 'resultados' + 'sesion_auditoria')
-- Registra el intento de un estudiante de ver un video/tarea.
create table if not exists activity_sessions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade,
  student_id uuid references profiles(user_id) on delete cascade,
  
  -- Nivel de Atención (calculado en el frontend al finalizar)
  attention_level text check (attention_level in ('alto', 'medio', 'bajo')), -- NULL mientras está en progreso
  
  -- Estado
  status text check (status in ('started', 'completed')) default 'started',
  started_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

-- 7. CUESTIONARIOS GENERADOS (Nuevo / Integración IA)
-- Almacena el Quiz generado dinámicamente para esa sesión específica.
create table if not exists generated_quizzes (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references activity_sessions(id) on delete cascade,
  content jsonb not null,      -- El JSON con preguntas y respuestas generado por Gemini
  student_answers jsonb,       -- (OPCIONAL) Las respuestas específicas que eligió el estudiante { "q1": "a", ... }
  
  -- Resultados del Quiz
  score_obtained float,        -- Calificación obtenida
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- =============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS) - "Lo que pediste sobre ver solo lo suyo"
-- =============================================================================

-- Habilitar RLS en todas las tablas nuevas
alter table classes enable row level security;
alter table class_enrollments enable row level security;
alter table tasks enable row level security;
alter table activity_sessions enable row level security;
alter table generated_quizzes enable row level security;

-- --- POLÍTICAS PARA CLASES ---
-- Eliminar políticas existentes si existen (para permitir re-ejecutar el script)
DROP POLICY IF EXISTS "Profesores ven todo (o solo suyas)" ON classes;
DROP POLICY IF EXISTS "Estudiantes ven sus clases" ON classes;
DROP POLICY IF EXISTS "Profesores crean clases" ON classes;

-- Profesores pueden ver todas las clases
CREATE POLICY "Profesores ven todo (o solo suyas)" ON classes 
FOR SELECT USING ( 
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN (1, 2) 
);

-- Estudiantes solo ven clases donde están inscritos
CREATE POLICY "Estudiantes ven sus clases" ON classes 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_enrollments WHERE class_id = classes.id AND student_id = auth.uid())
);

-- Admin/Profesor pueden crear clases
CREATE POLICY "Profesores crean clases" ON classes 
FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN (1, 2)
);

-- --- POLÍTICAS PARA TAREAS/VIDEOS ---
-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Acceso a tareas por clase" ON tasks;

-- Visibles si el usuario tiene acceso a la clase (Profesor dueño o Estudiante inscrito)
CREATE POLICY "Acceso a tareas por clase" ON tasks
FOR SELECT USING (
    -- Es Profesor/Admin
    (SELECT role FROM profiles WHERE user_id = auth.uid()) IN (1, 2)
    OR
    -- Es Estudiante inscrito
    EXISTS (SELECT 1 FROM class_enrollments WHERE class_id = tasks.class_id AND student_id = auth.uid())
);

-- --- POLÍTICAS PARA SESIONES Y QUIZZES (Datos privados del estudiante) ---
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Estudiantes ven sus sesiones" ON activity_sessions;
DROP POLICY IF EXISTS "Profesores ven sesiones de sus clases" ON activity_sessions;
DROP POLICY IF EXISTS "Acceso a quizzes propio o de profesor" ON generated_quizzes;

-- Estudiantes solo ven sus propias sesiones
CREATE POLICY "Estudiantes ven sus sesiones" ON activity_sessions
FOR ALL USING ( student_id = auth.uid() );

-- Profesores pueden ver sesiones de tareas que ellos crearon (Monitorización)
-- (Esta consulta es un poco más compleja, simplificada para rendimiento)
CREATE POLICY "Profesores ven sesiones de sus clases" ON activity_sessions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tasks 
        JOIN classes ON tasks.class_id = classes.id 
        WHERE tasks.id = activity_sessions.task_id 
        AND classes.professor_id = auth.uid()
    )
);

-- Repetir lógica similar para quizzes
CREATE POLICY "Acceso a quizzes propio o de profesor" ON generated_quizzes
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM activity_sessions 
        WHERE activity_sessions.id = session_id 
        AND (activity_sessions.student_id = auth.uid() -- Es mi quiz
             OR 
             EXISTS ( -- O soy el profesor revisando
                SELECT 1 FROM tasks 
                JOIN classes ON tasks.class_id = classes.id 
                WHERE tasks.id = activity_sessions.task_id 
                AND classes.professor_id = auth.uid()
             )
        )
    )
);
