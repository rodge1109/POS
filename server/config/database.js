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

const poolConfig = databaseUrl 
  ? {
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'restaurant_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

// Startup diagnostics: resolve DB host and perform a simple test query.
(async () => {
  try {
    const connStr = databaseUrl || null;
    let hostToCheck = null;
    if (connStr) {
      try {
        const url = new URL(connStr);
        hostToCheck = url.hostname;
        console.log('Diagnostics: DB host from DATABASE_URL =', hostToCheck);
      } catch (e) {
        console.warn('Diagnostics: failed to parse DATABASE_URL hostname:', e.message);
      }
    }
    if (!hostToCheck && poolConfig && poolConfig.host) {
      hostToCheck = poolConfig.host;
      console.log('Diagnostics: DB host from poolConfig =', hostToCheck);
    }

    if (hostToCheck) {
      try {
        const a = await dns.resolve4(hostToCheck);
        console.log('Diagnostics: DNS A records for', hostToCheck, '=', a);
      } catch (e) {
        console.warn('Diagnostics: DNS A lookup failed for', hostToCheck, '-', e.message);
      }
      try {
        const aaaa = await dns.resolve6(hostToCheck);
        console.log('Diagnostics: DNS AAAA records for', hostToCheck, '=', aaaa);
      } catch (e) {
        console.warn('Diagnostics: DNS AAAA lookup failed for', hostToCheck, '-', e.message);
      }
    }

    // perform a simple test query
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Diagnostics: DB test query succeeded');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Diagnostics: DB connection test failed:', err);
  }
})();

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
