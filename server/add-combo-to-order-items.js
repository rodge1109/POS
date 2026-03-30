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
    console.log('Adding combo support to order_items table...');

    // Check if combo_id column exists
    const checkComboId = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'order_items' AND column_name = 'combo_id'
    `);

    if (checkComboId.rows.length === 0) {
      // Make product_id nullable first
      await client.query(`
        ALTER TABLE order_items
        ALTER COLUMN product_id DROP NOT NULL
      `);
      console.log('Made product_id nullable.');

      // Add combo_id column
      await client.query(`
        ALTER TABLE order_items
        ADD COLUMN combo_id INTEGER REFERENCES combos(id)
      `);
      console.log('Added combo_id column.');

      // Add is_combo column for easier identification
      await client.query(`
        ALTER TABLE order_items
        ADD COLUMN is_combo BOOLEAN DEFAULT false
      `);
      console.log('Added is_combo column.');
    } else {
      console.log('combo_id column already exists.');
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
