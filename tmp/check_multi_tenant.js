
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new Pool({ connectionString });

async function checkMultiTenant() {
  try {
    console.log('--- Orders by Company ---');
    const res = await pool.query(`SELECT company_id, count(*) FROM orders GROUP BY company_id`);
    console.table(res.rows);

    console.log('--- Order Items by Company ---');
    const itemsRes = await pool.query(`SELECT company_id, count(*) FROM order_items GROUP BY company_id`);
    console.table(itemsRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkMultiTenant();
