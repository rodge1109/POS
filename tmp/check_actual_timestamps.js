
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new Pool({ connectionString });

async function checkActualTimestamps() {
  try {
    const res = await pool.query(`
      SELECT 
        id, 
        order_number, 
        created_at, 
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') as created_at_manila,
        current_timestamp as now_db,
        (current_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila') as now_manila
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.table(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkActualTimestamps();
