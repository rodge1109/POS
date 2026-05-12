
import pool from '../server/config/database.js';

async function checkData() {
  try {
    const res = await pool.query('SELECT id, name, username, company_id FROM employees LIMIT 5');
    console.log('Employees sample data:');
    console.log(res.rows);
  } catch (err) {
    console.error('Error checking data:', err);
  } finally {
    await pool.end();
  }
}

checkData();
