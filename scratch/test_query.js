
import pool from '../server/config/database.js';

async function test() {
  try {
    const res = await pool.query(`
      SELECT s.*, e.name as employee_name
      FROM shifts s
      JOIN employees e ON s.employee_id = e.id AND s.company_id = e.company_id
      LIMIT 1
    `);
    console.log('Result Row:', res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

test();
