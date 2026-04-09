import pool from '../server/config/database.js';

async function testQuery() {
    try {
        const company_id = 'd6797595-412e-4b3b-8378-4442a397d207';
        const date = '2026-04-09';
        
        console.log(`Testing query for ${date}...`);
        
        const res = await pool.query(`
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as total,
                (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date as local_date
            FROM orders 
            WHERE company_id::text = $1::text
            GROUP BY 3
            ORDER BY 3 DESC
        `, [company_id]);
        
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

testQuery();
