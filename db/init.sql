-- =====================================================================
-- EcoHome Store · Script de inicialización de PostgreSQL
--
-- Crea las tablas (users, products, messages) y carga datos semilla.
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin duplicar ni perder datos
-- (CREATE ... IF NOT EXISTS, ON CONFLICT DO NOTHING). El backend aplica el
-- mismo esquema al arrancar, así que este script es opcional; sirve para
-- preparar la base a mano y para cargar el seed.
--
-- Uso (la base "ecohome_store" debe existir):
--   psql -U postgres -d ecohome_store -f db/init.sql
--   o, sin psql instalado:  cd backend && npm run db:init
--
-- Credenciales de prueba (contraseñas cifradas con bcrypt, costo 10):
--   admin@ecohome.com    / Admin123!     (usuario "admin",   rol admin)
--   cliente@ecohome.com  / Cliente123!   (usuario "cliente", rol cliente)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------

-- Usuarios. `email` y `role` amplían el modelo mínimo (id, username,
-- password_hash, created_at): el login es por correo y solo el rol 'admin'
-- puede escribir en el catálogo.
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL       PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'cliente',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo. `created_by` da la trazabilidad (quién creó el producto) y
-- alimenta el contador "Nombre (N)". Si se borra el usuario, el producto se
-- conserva con created_by = NULL.
CREATE TABLE IF NOT EXISTS products (
    id         SERIAL         PRIMARY KEY,
    name       VARCHAR(150)   NOT NULL,
    price      NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    created_by INT            REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Mensajes del chat. El nombre de quien escribe NO se guarda aquí: se obtiene
-- con un JOIN a `users` (una sola fuente de verdad).
CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL    PRIMARY KEY,
    user_id    INT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. Migración de bases creadas por versiones anteriores (idempotente)
-- ---------------------------------------------------------------------

-- Unidad 3 · Actividad 2: trazabilidad en productos que ya existían.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;

-- Versión previa de `messages`: columnas `text` y `username` -> `content`.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema()
                 AND table_name = 'messages' AND column_name = 'text') THEN
        ALTER TABLE messages RENAME COLUMN "text" TO content;
    END IF;
END $$;
ALTER TABLE messages DROP COLUMN IF EXISTS username;

-- ---------------------------------------------------------------------
-- 3. Índices
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products (created_by);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);

-- ---------------------------------------------------------------------
-- 4. Datos semilla
-- ---------------------------------------------------------------------
INSERT INTO users (username, email, password_hash, role) VALUES
    ('admin',   'admin@ecohome.com',   '$2a$10$oINW/VX23TMLA.fvqESmD.bG.UkebudT3x9v53HUB6yhuK1Pidnxy', 'admin'),
    ('cliente', 'cliente@ecohome.com', '$2a$10$tB81kl6UlMIhZa9JZ0siO.RZSjKiwtQbVS1mKH9tHIOpk7flVGn3O', 'cliente')
ON CONFLICT DO NOTHING;

-- Productos de ejemplo (precios en COP), solo si el catálogo está vacío.
INSERT INTO products (name, price, created_by)
SELECT p.name, p.price, (SELECT id FROM users WHERE username = 'admin')
FROM (VALUES
    ('Bombillo LED ahorrador 9W',            12900.00),
    ('Panel solar portátil 20W',            189000.00),
    ('Botella reutilizable de acero 750 ml', 45900.00),
    ('Compostera de cocina 5 L',             68000.00),
    ('Kit de bolsas de tela (x5)',           24500.00),
    ('Regleta inteligente con apagado',      79900.00)
) AS p(name, price)
WHERE NOT EXISTS (SELECT 1 FROM products);

-- Mensajes de bienvenida, solo si el chat está vacío.
INSERT INTO messages (user_id, content)
SELECT (SELECT id FROM users WHERE username = m.author), m.content
FROM (VALUES
    ('admin',   '¡Bienvenidos al chat de EcoHome Store! 🌿'),
    ('cliente', 'Hola, ¿tienen paneles solares en stock?'),
    ('admin',   'Sí, el panel portátil de 20W está en el catálogo.')
) AS m(author, content)
WHERE NOT EXISTS (SELECT 1 FROM messages)
  AND EXISTS (SELECT 1 FROM users WHERE username IN ('admin', 'cliente'));

-- Verificación rápida:
--   SELECT p.id, p.name, p.price, u.username AS creador
--   FROM products p LEFT JOIN users u ON u.id = p.created_by ORDER BY p.id;
--   SELECT u.username, COUNT(p.id) AS productos
--   FROM users u LEFT JOIN products p ON p.created_by = u.id GROUP BY u.username;
