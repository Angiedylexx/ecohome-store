require("dotenv").config();

// Si se define DATABASE_URL (típico en proveedores en la nube como Neon,
// Supabase o Railway, que entregan una única cadena de conexión), se usa
// esa; de lo contrario se arma la configuración a partir de variables
// sueltas (DB_HOST, DB_USER, etc.), pensadas para un PostgreSQL local.
const usingConnectionString = Boolean(process.env.DATABASE_URL);

module.exports = {
  port: process.env.PORT || 4001,
  db: usingConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "ecohome_chat",
      },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  },
};
