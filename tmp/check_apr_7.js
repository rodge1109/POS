
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new Pool({ connectionString });

async function checkDate() {
  try {
    const res = await pool.query(`
      SELECT 
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date as manila_date, 
        count(*) 
      FROM orders 
      GROUP BY manila_date 
      ORDER BY manila_date DESC
    `);
    console.table(res.rows);

    const fullRes = await pool.query(`SELECT created_at FROM orders ORDER BY created_at DESC LIMIT 5`);
    console.log('--- Raw UTC Timestamps ---');
    console.table(fullRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkDate();
