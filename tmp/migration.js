import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'restaurant_db',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
  try {
    console.log(`Connecting to ${process.env.DB_NAME}...`);
    
    // Add size_id to product_composition
    await pool.query(`
      ALTER TABLE product_composition ADD COLUMN IF NOT EXISTS size_id INTEGER;
    `);
    console.log('Added size_id to product_composition');

    // Add size_id to inventory_transactions
    await pool.query(`
      ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS size_id INTEGER;
    `);
    console.log('Added size_id to inventory_transactions');

    // Update unique constraint on product_composition
    await pool.query(`
      ALTER TABLE product_composition DROP CONSTRAINT IF EXISTS product_composition_company_id_product_id_ingredient_id_key;
      ALTER TABLE product_composition DROP CONSTRAINT IF EXISTS product_composition_unique_link;
    `);
    
    await pool.query(`
      ALTER TABLE product_composition ADD CONSTRAINT product_composition_unique_link UNIQUE (company_id, product_id, ingredient_id, size_id);
    `);
    console.log('Updated unique constraint on product_composition');

    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
