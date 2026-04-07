import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function enforceUuid() {
  const client = await pool.connect();
  try {
    console.log('ENFORCING UUID: orders.company_id...');
    // Convert back if it was changed
    await client.query('ALTER TABLE orders ALTER COLUMN company_id TYPE uuid USING company_id::uuid');
    
    console.log('ENFORCING UUID: tables.company_id...');
    await client.query('ALTER TABLE tables ALTER COLUMN company_id TYPE uuid USING company_id::uuid');

    console.log('SUCCESS: Database company_id columns are now strictly UUID.');
  } catch (err) {
    if (err.message.includes('already of type uuid')) {
        console.log('NOTE: Columns were already UUID. No change needed.');
    } else {
        console.error('RESTORE FAILED:', err.message);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
enforceUuid();
