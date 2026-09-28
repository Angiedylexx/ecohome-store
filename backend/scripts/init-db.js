// Ejecuta db/init.sql (esquema + datos semilla) sin necesitar `psql`.
//   npm run db:init
// Si la base indicada en DB_NAME no existe, la crea conectándose a "postgres".
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
};
const dbName = process.env.DB_NAME;

async function ensureDatabase() {
  const admin = new Client({ ...config, database: 'postgres' });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
      // Los identificadores no admiten parámetros: se escapan las comillas dobles.
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`Base de datos "${dbName}" creada.`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  const sqlFile = path.join(__dirname, '..', '..', 'db', 'init.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  await ensureDatabase();

  const client = new Client({ ...config, database: dbName });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`db/init.sql aplicado en "${dbName}" (tablas + datos semilla).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('No se pudo inicializar la base de datos:', err.message);
  process.exit(1);
});
