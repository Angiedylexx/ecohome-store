// Mensajes del chat (portado de la Unidad 2 al backend unificado): misma BD y
// misma tabla `users` que el catálogo, por lo que un solo JWT sirve para todo.
const pool = require('../config/db');

const MessageModel = {
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id         SERIAL PRIMARY KEY,
        user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username   VARCHAR(50)  NOT NULL,
        text       TEXT         NOT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at)');
  },

  async insert({ userId, username, text }) {
    const { rows } = await pool.query(
      `INSERT INTO messages (user_id, username, text)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, username, text, created_at`,
      [userId, username, text]
    );
    return rows[0];
  },

  // Últimos `limit` mensajes, del más reciente al más antiguo.
  async listLast(limit = 10) {
    const { rows } = await pool.query(
      `SELECT id, user_id, username, text, created_at
       FROM messages ORDER BY created_at DESC, id DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },
};

module.exports = MessageModel;
