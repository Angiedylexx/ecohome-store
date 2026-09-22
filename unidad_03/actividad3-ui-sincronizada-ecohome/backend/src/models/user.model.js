const pool = require('../config/db');

const UserModel = {
  // Crea la tabla `users` si todavía no existe.
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(50)  NOT NULL UNIQUE,
        email         VARCHAR(150) NOT NULL UNIQUE,
        password_hash TEXT         NOT NULL,
        role          VARCHAR(20)  NOT NULL DEFAULT 'cliente',
        created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  },

  // Inserta un usuario nuevo. `passwordHash` ya debe venir cifrado
  // (el controlador es responsable de aplicar bcrypt antes de llamar aquí).
  async create({ username, email, passwordHash, role }) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, COALESCE($4, 'cliente'))
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash, role]
    );
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },

  async findByUsername(username) {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0];
  },
};

module.exports = UserModel;
