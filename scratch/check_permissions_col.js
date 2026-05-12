
import pool from '../server/config/database.js';

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'permissions'
    `);
    console.log('Permissions column details:');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
