import pool from './server/config/database.js';

async function run() {
  try {
    const res = await pool.query('SELECT COUNT(*) from orders WHERE company_id = $1', [undefined]);
    console.log('Result with undefined:', res.rows);
  } catch (e) {
    console.error('Error with undefined:', e.message);
  }
  process.exit(0);
}

run();
