import pool from '../server/config/database.js';

async function dumpOrders() {
  try {
    const res = await pool.query("SELECT id, order_number, created_at FROM orders ORDER BY created_at DESC LIMIT 5");
    console.log('Orders created_at values:');
    res.rows.forEach(o => {
      console.log(`Order ${o.order_number}: ${o.created_at} (${typeof o.created_at})`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

dumpOrders();
