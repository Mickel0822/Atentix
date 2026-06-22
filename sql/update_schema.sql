-- Agrega la columna questions_count a la tabla tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS questions_count INT DEFAULT 5;
