import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

/*export const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false } // ⚠️ necesario para Render
});*/

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render te da esta URL completa
  ssl: { rejectUnauthorized: false } // ⚠️ necesario para conexiones seguras a Render
});

export default pool;
