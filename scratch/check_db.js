import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' });
async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'");
    console.log(res.rows.map(r => r.column_name));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
check();
