
import pkg from 'pg';
const { Pool } = pkg;

// Using Supabase connection string directly for testing (I'll extract it from .env or just use the system configuration)
// I'll check .env first.
import fs from 'fs';
const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();

const pool = new Pool({ connectionString });

async function checkOrders() {
  try {
    const res = await pool.query(`
      SELECT 
        id, 
        order_number, 
        created_at, 
        order_status,
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') as created_at_manila,
        ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')::date as date_manila
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log('--- Last 10 Orders ---');
    console.table(res.rows);
    
    const countRes = await pool.query(`
        SELECT count(*) FROM orders
    `);
    console.log('Total orders:', countRes.rows[0].count);

    const statusRes = await pool.query(`
        SELECT order_status, count(*) FROM orders GROUP BY order_status
    `);
    console.log('--- Order Statuses ---');
    console.table(statusRes.rows.map(r => ({ status: r.order_status, count: r.count })));

    // Check if there are orders that aren't appearing due to status filter
    const statusTestRes = await pool.query(`
        SELECT order_status, count(*) as count
        FROM orders 
        GROUP BY order_status
    `);
    console.log('--- Detailed Status Break-down ---');
    console.table(statusTestRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkOrders();
