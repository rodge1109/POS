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

// Build pool config. If DATABASE_URL is set, prefer it but attempt an IPv4 fallback
// when DNS returns A records (to avoid IPv6 routing issues on some hosts).
let poolConfig = null;
let pool = null;

if (databaseUrl) {
  try {
    // Try to prefer IPv4: resolve A records for host and, if found, replace hostname
    const url = new URL(databaseUrl);
    const host = url.hostname;
    let useHost = host;
    try {
      const aRecords = await dns.resolve4(host);
      if (aRecords && aRecords.length > 0) {
        useHost = aRecords[0];
        console.log('Using IPv4 address for DB host:', useHost);
      } else {
        console.log('No A records found for', host);
      }
    } catch (e) {
      console.warn('IPv4 lookup failed for', host, '-', e.message);
    }

    // If host changed to IPv4, rebuild connection string
    if (useHost !== host) {
      url.hostname = useHost;
      // Reconstruct connection string preserving query/search params
      const connStr = url.toString();
      poolConfig = { connectionString: connStr, ssl: { rejectUnauthorized: false } };
    } else {
      poolConfig = { connectionString: databaseUrl, ssl: { rejectUnauthorized: false } };
    }
  } catch (e) {
    console.warn('Failed to parse/handle DATABASE_URL, falling back to individual DB_* vars:', e.message);
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'restaurant_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };
  }
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'restaurant_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

pool = new Pool(poolConfig);

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
