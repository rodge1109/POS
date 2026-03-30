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
    console.log('Creating tables table...');

    // Create restaurant tables table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id SERIAL PRIMARY KEY,
        table_number VARCHAR(10) NOT NULL UNIQUE,
        capacity INTEGER NOT NULL DEFAULT 4,
        section VARCHAR(50) DEFAULT 'Main',
        status VARCHAR(20) NOT NULL DEFAULT 'available'
          CHECK (status IN ('available', 'occupied', 'reserved', 'needs-cleaning')),
        current_order_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created tables table.');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status)
    `);
    console.log('Created tables indexes.');

    // Add table_id column to orders table if it doesn't exist
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'table_id'
    `);

    if (checkColumn.rows.length === 0) {
      await client.query(`
        ALTER TABLE orders ADD COLUMN table_id INTEGER
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id)
      `);
      console.log('Added table_id column to orders table.');
    } else {
      console.log('table_id column already exists in orders table.');
    }

    // Seed default tables if none exist
    const existing = await client.query('SELECT COUNT(*) FROM tables');
    if (parseInt(existing.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO tables (table_number, capacity, section) VALUES
          ('1', 2, 'Main'), ('2', 2, 'Main'), ('3', 4, 'Main'),
          ('4', 4, 'Main'), ('5', 6, 'Main'), ('6', 6, 'Main'),
          ('7', 4, 'Patio'), ('8', 4, 'Patio'), ('9', 8, 'Patio'),
          ('10', 8, 'VIP')
      `);
      console.log('Seeded 10 default tables.');
    } else {
      console.log('Tables already exist, skipping seed.');
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
