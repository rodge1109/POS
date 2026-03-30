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
    console.log('Creating shifts table...');

    // Create shifts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
        closing_cash DECIMAL(10,2),
        expected_cash DECIMAL(10,2),
        cash_variance DECIMAL(10,2),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created shifts table.');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_employee_id ON shifts(employee_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time)
    `);
    console.log('Created shifts indexes.');

    // Add shift_id column to orders table if it doesn't exist
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'shift_id'
    `);

    if (checkColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE orders ADD COLUMN shift_id INTEGER REFERENCES shifts(id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_shift_id ON orders(shift_id)
      `);
      console.log('Added shift_id column to orders table.');
    } else {
      console.log('shift_id column already exists in orders table.');
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
