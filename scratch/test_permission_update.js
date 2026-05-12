
import pool from '../server/config/database.js';

async function testUpdate() {
  try {
    // Get first employee
    const empRes = await pool.query('SELECT id, company_id FROM employees LIMIT 1');
    if (empRes.rows.length === 0) {
      console.log('No employees found');
      return;
    }
    const emp = empRes.rows[0];
    console.log(`Testing update for employee ID: ${emp.id}, Company ID: ${emp.company_id}`);

    const permissions = ['pos', 'orders'];
    const id = emp.id;
    const company_id = emp.company_id;

    const result = await pool.query(
      'UPDATE employees SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE id::text = $2::text AND company_id::uuid = $3::uuid RETURNING id, permissions',
      [permissions, id, company_id]
    );

    console.log('Update result:', result.rows[0]);
  } catch (err) {
    console.error('Update failed with error:', err);
  } finally {
    await pool.end();
  }
}

testUpdate();
