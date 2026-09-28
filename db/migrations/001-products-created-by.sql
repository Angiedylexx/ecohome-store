-- Unidad 3 · Actividad 2: trazabilidad de productos.
-- Migración puntual e idempotente para una base que ya tiene `products`.
-- (db/init.sql ya incluye este cambio; el backend también lo aplica al arrancar.)
--
--   psql -U postgres -d ecohome_store -f db/migrations/001-products-created-by.sql

ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;

-- Índice para consultas/contadores por usuario.
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products (created_by);
