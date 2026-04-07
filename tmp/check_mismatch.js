
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new Pool({ connectionString });

async function checkMismatch() {
  try {
    const res = await pool.query(`
      SELECT 
        o.id, 
        o.order_number, 
        o.company_id as order_comp, 
        oi.company_id as item_comp 
      FROM orders o 
      LEFT JOIN order_items oi ON o.id::text = oi.order_id::text 
      ORDER BY o.created_at DESC 
      LIMIT 10
    `);
    console.table(res.rows);

    const checkNulls = await pool.query(`
        SELECT count(*) FROM order_items WHERE company_id IS NULL
    `);
    console.log('Items with NULL company_id:', checkNulls.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkMismatch();
