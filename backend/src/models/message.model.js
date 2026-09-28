// Mensajes del chat: misma BD y misma tabla `users` que el catálogo, por lo
// que un solo JWT sirve para todo. La tabla guarda solo (id, user_id, content,
// created_at); el nombre del autor sale de un JOIN con `users`.
const pool = require('../config/db');

const SELECT_WITH_AUTHOR = `
  SELECT m.id, m.user_id, u.username, m.content, m.created_at
  FROM messages m
  JOIN users u ON u.id = m.user_id
`;

const MessageModel = {
  async init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id         SERIAL PRIMARY KEY,
        user_id    INT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content    TEXT      NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migración (idempotente) de la versión anterior: text/username -> content.
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema()
                     AND table_name = 'messages' AND column_name = 'text') THEN
          ALTER TABLE messages RENAME COLUMN "text" TO content;
        END IF;
      END $$;
    `);
    await pool.query('ALTER TABLE messages DROP COLUMN IF EXISTS username');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at)');
  },

  async insert({ userId, content }) {
    const { rows } = await pool.query(
      'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING id',
      [userId, content]
    );
    const { rows: saved } = await pool.query(`${SELECT_WITH_AUTHOR} WHERE m.id = $1`, [rows[0].id]);
    return saved[0];
  },

  // Últimos `limit` mensajes, del más reciente al más antiguo.
  async listLast(limit = 10) {
    const { rows } = await pool.query(
      `${SELECT_WITH_AUTHOR} ORDER BY m.created_at DESC, m.id DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },
};

module.exports = MessageModel;
