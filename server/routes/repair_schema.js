import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function repair() {
  const client = await pool.connect();
  try {
    console.log('REPAIRING SCHEMA: orders.table_id...');
    await client.query('ALTER TABLE orders ALTER COLUMN table_id TYPE text');
    console.log('SUCCESS: orders.table_id is now TEXT');
    
    console.log('REPAIRING SCHEMA: order_items.order_id...');
    await client.query('ALTER TABLE order_items ALTER COLUMN order_id TYPE text');
    console.log('SUCCESS: order_items.order_id is now TEXT');
  } catch (err) {
    console.error('REPAIR FAILED:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
repair();
