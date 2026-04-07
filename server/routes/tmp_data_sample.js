import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    console.log('--- ORDERS SAMPLE ---');
    const ordersRes = await client.query("SELECT id, table_id, order_number FROM orders ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(ordersRes.rows, null, 2));

    console.log('--- TABLES BREADCRUMB ---');
    const tablesRes = await client.query("SELECT id, table_number FROM tables LIMIT 5");
    console.log(JSON.stringify(tablesRes.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}
check();
