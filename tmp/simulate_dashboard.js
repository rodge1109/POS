
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new Pool({ connectionString });

const COMPANY_ID = 'd6797595-412e-4b3b-8378-4442a397d207';

async function simulateDashboardFetch() {
  try {
    // Simulate what DashboardPage does for 'today' (April 7 Manila)
    // Today Manila start is April 6 16:00 UTC. 
    // toISOString() on April 7 midnight Manila is 2026-04-06.
    const start = '2026-04-06';
    const end = '2026-04-07';

    console.log(`Searching for orders between ${start} and ${end} (Manila Date)`);
    
    // Main query
    const res = await pool.query(`
      SELECT o.*
      FROM orders o
      WHERE o.company_id::uuid = $1::uuid
      AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date >= $2
      AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date <= $3
      ORDER BY o.created_at DESC
    `, [COMPANY_ID, start, end]);

    console.log(`Found ${res.rows.length} orders.`);
    if (res.rows.length > 0) {
      console.log('Sample order:', JSON.stringify(res.rows[0], null, 2));
      
      const orderIds = res.rows.map(o => o.id);
      
      // Items query
      const itemsRes = await pool.query(`
        SELECT oi.*
        FROM order_items oi
        WHERE oi.order_id::text = ANY($1::text[]) 
        AND oi.company_id::uuid = $2::uuid
      `, [orderIds.map(id => String(id)), COMPANY_ID]);
      
      console.log(`Found ${itemsRes.rows.length} items for these orders.`);
      if (itemsRes.rows.length > 0) {
        console.log('Sample item:', JSON.stringify(itemsRes.rows[0], null, 2));
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

simulateDashboardFetch();
