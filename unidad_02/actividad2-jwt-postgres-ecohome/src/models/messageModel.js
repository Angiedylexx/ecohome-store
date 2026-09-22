const { query } = require("../db");

// Inserta un mensaje y devuelve la fila creada (con id y created_at
// generados por PostgreSQL).
async function insertMessage({ userId, username, text }) {
  const result = await query(
    `INSERT INTO messages (user_id, username, text)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, username, text, created_at`,
    [userId, username, text]
  );

  return result.rows[0];
}

// Lista los últimos mensajes persistidos, del más reciente al más antiguo.
async function listMessages(limit = 50) {
  const result = await query(
    `SELECT id, user_id, username, text, created_at
     FROM messages
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

module.exports = { insertMessage, listMessages };
