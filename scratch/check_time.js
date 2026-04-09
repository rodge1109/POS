import pool from '../server/config/database.js';

async function checkTime() {
    try {
        const res = await pool.query("SELECT now(), now() AT TIME ZONE 'Asia/Manila' as manila_now");
        console.table(res.rows);
        
        const res2 = await pool.query("SELECT created_at FROM orders ORDER BY created_at DESC LIMIT 1");
        console.log("Latest order created_at:");
        console.table(res2.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkTime();
