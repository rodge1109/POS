import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding service_type column to orders table...');

    // Check if service_type column exists
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'service_type'
    `);

    if (checkColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE orders
        ADD COLUMN service_type VARCHAR(20) DEFAULT 'dine-in'
      `);
      console.log('Added service_type column.');

      // Update existing POS orders to have dine-in as default
      await client.query(`
        UPDATE orders SET service_type = 'dine-in' WHERE order_type = 'pos' AND service_type IS NULL
      `);
      console.log('Updated existing POS orders with default service type.');
    } else {
      console.log('service_type column already exists.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
