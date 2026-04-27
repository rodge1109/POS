import pool from '../server/config/database.js';
async function check() {
  try {
    const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_transactions'");
    console.log('Columns:', r.rows.map(c => c.column_name));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
