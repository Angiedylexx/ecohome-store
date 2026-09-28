const { Pool, types } = require('pg');
require('dotenv').config();

// Las columnas created_at/updated_at son `timestamp` (sin zona). Se fija la
// sesión en UTC y se leen como UTC: si no, `pg` las interpreta con la zona del
// servidor Node y los clientes muestran la hora desplazada (p. ej. 5 h en Colombia).
types.setTypeParser(types.builtins.TIMESTAMP, (value) => new Date(`${value.replace(' ', 'T')}Z`));

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  options: '-c timezone=UTC',
});

pool.on('error', (err) => {
  console.error('Error inesperado en la conexion de postgreSQL:', err);
});

module.exports = pool;
