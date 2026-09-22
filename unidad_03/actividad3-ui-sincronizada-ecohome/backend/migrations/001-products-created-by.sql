-- Actividad 2 (Unidad 3): trazabilidad de productos.
-- Migración idempotente para una base que ya tiene la tabla `products`.
-- (El servidor también la aplica automáticamente al arrancar: ProductModel.init()).
--
--   psql -U postgres -d ecohome_store -f migrations/001-products-created-by.sql

ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;

-- Índice para consultas/contadores por usuario (Actividad 3).
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products (created_by);

-- Verificación: productos con su creador
-- SELECT p.id, p.name, p.price, u.username AS creador
-- FROM products p LEFT JOIN users u ON u.id = p.created_by ORDER BY p.id;
