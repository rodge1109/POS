import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function repair() {
  const client = await pool.connect();
  try {
    console.log('REPAIRING SCHEMA: orders.table_id to TEXT...');
    await client.query('ALTER TABLE orders ALTER COLUMN table_id TYPE text');
    
    console.log('REPAIRING SCHEMA: order_items.order_id to TEXT...');
    await client.query('ALTER TABLE order_items ALTER COLUMN order_id TYPE text');

    console.log('REPAIRING SCHEMA: orders.company_id to TEXT...');
    // We use USING to allow conversion from UUID to TEXT
    await client.query('ALTER TABLE orders ALTER COLUMN company_id TYPE text USING company_id::text');

    console.log('REPAIRING SCHEMA: tables.company_id to TEXT...');
    await client.query('ALTER TABLE tables ALTER COLUMN company_id TYPE text USING company_id::text');

    console.log('SUCCESS: Structural format bridge complete.');
  } catch (err) {
    console.error('REPAIR FAILED:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
repair();
