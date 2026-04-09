import pool from '../server/config/database.js';

async function testTimezone() {
    try {
        const ts = '2026-04-08T02:38:15.136Z'; // Sample from earlier
        const res = await pool.query(`
            SELECT 
                $1::timestamp as original,
                ($1::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date as local_date,
                ($1::timestamp AT TIME ZONE 'Asia/Manila')::date as direct_date,
                ($1::timestamp)::date as raw_date
        `, [ts]);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

testTimezone();
