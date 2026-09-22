-- ============================================================
-- EcoHome Store - Chat interno
-- Actividad 2: Seguridad y persistencia (JWT + PostgreSQL)
-- ============================================================
-- Ejecutar con: psql -U <usuario> -d <base_de_datos> -f sql/schema.sql

-- Tabla de usuarios (necesaria para autenticar y emitir JWT)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mensajes del chat (requerimiento principal de la Actividad 2)
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username   VARCHAR(50) NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para listar mensajes recientes rápidamente
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

-- ------------------------------------------------------------
-- Consulta SQL de verificación (evidencia de persistencia)
-- ------------------------------------------------------------
-- SELECT m.id, m.username, m.text, m.created_at
-- FROM messages m
-- ORDER BY m.created_at DESC
-- LIMIT 20;
