const { query } = require("../db");

async function createUser({ username, passwordHash }) {
  const result = await query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username, created_at`,
    [username, passwordHash]
  );

  return result.rows[0];
}

async function findUserByUsername(username) {
  const result = await query(
    `SELECT id, username, password_hash FROM users WHERE username = $1`,
    [username]
  );

  return result.rows[0] || null;
}

module.exports = { createUser, findUserByUsername };
