import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Build pool config. We prefer DATABASE_URL if available.
let poolConfig = {};
let pool;

if (databaseUrl) {
  poolConfig = {
    connectionString: databaseUrl,
    ssl: { 
      rejectUnauthorized: false // Required for Supabase/Heroku/Render
    }
  };
} else {
  // Fallback to individual variables if DATABASE_URL is missing
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'restaurant_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

pool = new Pool({
  ...poolConfig,
  max: isProduction ? 10 : 20,
  idleTimeoutMillis: isProduction ? 30000 : 60000,
  connectionTimeoutMillis: isProduction ? 15000 : 20000,
});


// Non-blocking// Diagnostics removed
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});


export default pool;
