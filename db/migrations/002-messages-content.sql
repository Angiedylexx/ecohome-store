-- Chat: `messages` pasa a (id, user_id, content, created_at).
-- Versión previa: columnas `text` y `username`. Idempotente.
-- (db/init.sql y el backend ya aplican este cambio; sirve para hacerlo a mano.)
--
--   psql -U postgres -d ecohome_store -f db/migrations/002-messages-content.sql

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema()
                 AND table_name = 'messages' AND column_name = 'text') THEN
        ALTER TABLE messages RENAME COLUMN "text" TO content;
    END IF;
END $$;

ALTER TABLE messages DROP COLUMN IF EXISTS username;
