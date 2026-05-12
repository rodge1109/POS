
import pool from '../server/config/database.js';

async function checkTriggers() {
  try {
    const res = await pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table = 'employees'
    `);
    console.log('Employees table triggers:');
    console.log(res.rows);
  } catch (err) {
    console.error('Error checking triggers:', err);
  } finally {
    await pool.end();
  }
}

checkTriggers();
