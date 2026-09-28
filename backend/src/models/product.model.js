// Tabla `products` y funciones CRUD sobre PostgreSQL.
// Actividad 2 (Unidad 3): cada producto queda ligado al usuario que lo creó
// mediante `products.created_by` (FK -> users.id) para auditoría/trazabilidad.

const pool = require('../config/db');

// Columnas del producto + datos mínimos del creador. LEFT JOIN: los productos
// anteriores a la migración (created_by NULL) siguen apareciendo en el listado.
const SELECT_WITH_CREATOR = `
  SELECT p.id, p.name, p.price, p.created_by, p.created_at, p.updated_at,
         u.username AS creator_username
  FROM products p
  LEFT JOIN users u ON u.id = p.created_by
`;

// Convierte la fila SQL en la respuesta de la API. Se conservan todos los
// campos previos (id, name, price, created_at, updated_at) para no romper a
// los clientes React/Flutter y se agrega `creator: { id, username }`.
function toProduct(row) {
  if (!row) return row;
  const { creator_username: creatorUsername, ...product } = row;
  return {
    ...product,
    creator:
      product.created_by === null
        ? null
        : { id: product.created_by, username: creatorUsername },
  };
}

const ProductModel = {
  // Requiere que la tabla `users` ya exista (ver server.js): la FK apunta a ella.
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(150)   NOT NULL,
        price      NUMERIC(10, 2) NOT NULL,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migración para bases ya existentes (idempotente): agrega el creador sin
    // perder los productos registrados antes de esta actividad.
    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;
    `);
  },

  async getAll() {
    const { rows } = await pool.query(`${SELECT_WITH_CREATOR} ORDER BY p.id`);
    return rows.map(toProduct);
  },

  // `createdBy` es el id del usuario autenticado (viene del JWT, nunca del body).
  async create({ name, price, createdBy }) {
    const { rows } = await pool.query(
      'INSERT INTO products (name, price, created_by) VALUES ($1, $2, $3) RETURNING id',
      [name, price, createdBy]
    );
    return this.getById(rows[0].id);
  },

  async getById(id) {
    const { rows } = await pool.query(`${SELECT_WITH_CREATOR} WHERE p.id = $1`, [id]);
    return toProduct(rows[0]);
  },

  // Actualiza nombre y precio; el creador original NO se modifica.
  async update(id, { name, price }) {
    const { rows } = await pool.query(
      `UPDATE products
       SET name = $1, price = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id`,
      [name, price, id]
    );
    return rows[0] ? this.getById(rows[0].id) : undefined;
  },

  // Cantidad de productos creados por un usuario (métrica "Nombre (N)").
  async countByCreator(userId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM products WHERE created_by = $1',
      [userId]
    );
    return rows[0].count;
  },

  async delete(id) {
    const product = await this.getById(id);
    if (!product) return undefined;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return product;
  },
};

module.exports = ProductModel;
