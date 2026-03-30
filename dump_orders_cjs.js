const pg = require('pg');
const pool = new pg.Pool({
  connectionString: \"postgresql://postgres:postgres@localhost:5432/pos_db\"
});

async function run() {
  try {
    const res = await pool.query(\"SELECT id, order_number, company_id, order_status, created_at FROM orders WHERE company_id = '49cbf30f-867a-4346-bf2b-541bcd0e6aa2'\");
    console.log('Orders for company Kylle:', res.rows);
  } catch(e) { console.error(e); }
  finally { await pool.end(); }
}
run();
