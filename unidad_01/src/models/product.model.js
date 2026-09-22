//Script de creacion de la tabla products y funciones CRUD para interactuar con la base de datos PostgreSQL

const pool = require('../config/db');

const ProductModel = {
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(150)   NOT NULL,
        price      NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  },

  async getAll() {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id');
    return rows;
  },

  async create(data) {
    const { name, price } = data;
    const { rows } = await pool.query(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    return rows[0];
  },

  async getById(id) {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return rows[0];
  },

  async update(id, data) {
    const { name, price } = data;
    const { rows } = await pool.query(
      `UPDATE products
       SET name = $1, price = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [name, price, id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },
};

module.exports = ProductModel;
