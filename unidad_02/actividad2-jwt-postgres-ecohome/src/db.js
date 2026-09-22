const { Pool } = require("pg");
const config = require("./config");

// Pool de conexiones a PostgreSQL. No conecta inmediatamente: abre
// conexiones bajo demanda cada vez que se ejecuta una query.
const pool = new Pool(config.db);

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
