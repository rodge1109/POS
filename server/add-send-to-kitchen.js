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
    console.log('Adding send_to_kitchen column to products table...');

    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'send_to_kitchen'
    `);

    if (checkResult.rows.length > 0) {
      console.log('Column "send_to_kitchen" already exists.');
      // Backfill any NULLs just in case
      const updated = await client.query(`
        UPDATE products SET send_to_kitchen = true WHERE send_to_kitchen IS NULL
      `);
      console.log(`Backfilled ${updated.rowCount} rows with NULL send_to_kitchen -> true.`);
    } else {
      await client.query(`
        ALTER TABLE products ADD COLUMN send_to_kitchen BOOLEAN DEFAULT true
      `);
      // Set all existing rows to true
      await client.query(`
        UPDATE products SET send_to_kitchen = true WHERE send_to_kitchen IS NULL
      `);
      console.log('Added "send_to_kitchen" column and set all existing products to true.');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
