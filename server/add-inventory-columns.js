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
    console.log('Adding inventory columns to products table...');

    // Check if stock_quantity column exists
    const checkStock = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'stock_quantity'
    `);

    if (checkStock.rows.length === 0) {
      await client.query(`
        ALTER TABLE products
        ADD COLUMN stock_quantity INTEGER DEFAULT 0
      `);
      console.log('Added stock_quantity column.');
    } else {
      console.log('stock_quantity column already exists.');
    }

    // Check if low_stock_threshold column exists
    const checkThreshold = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'low_stock_threshold'
    `);

    if (checkThreshold.rows.length === 0) {
      await client.query(`
        ALTER TABLE products
        ADD COLUMN low_stock_threshold INTEGER DEFAULT 10
      `);
      console.log('Added low_stock_threshold column.');
    } else {
      console.log('low_stock_threshold column already exists.');
    }

    // Set default stock for existing products
    await client.query(`
      UPDATE products
      SET stock_quantity = 100, low_stock_threshold = 10
      WHERE stock_quantity IS NULL OR stock_quantity = 0
    `);
    console.log('Set default stock values for existing products.');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
