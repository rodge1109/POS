import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'table_id'
    `);
    console.log('VERIFICATION RESULT:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('VERIFICATION FAILED:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
verify();
