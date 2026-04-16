import pool from '../server/config/database.js';

async function checkTime() {
  try {
    const res = await pool.query("SHOW timezone");
    console.log('Database Timezone:', res.rows[0]);
    const res2 = await pool.query("SELECT NOW() as db_now, CURRENT_TIMESTAMP as db_timestamp");
    console.log('Database Result:', res2.rows[0]);
    console.log('Local JS Time:', new Date().toString());
    console.log('Local JS ISO:', new Date().toISOString());
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkTime();
