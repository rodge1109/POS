import pool from '../server/config/database.js';

async function testQueryWithPostStatus() {
    try {
        const company_id = 'd6797595-412e-4b3b-8378-4442a397d207';
        
        const res = await pool.query(`
            SELECT 
                (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date as local_date,
                posted_to_ledger,
                COUNT(*) as count
            FROM orders 
            WHERE company_id::text = $1::text
            GROUP BY 1, 2
            ORDER BY 1 DESC
        `, [company_id]);
        
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

testQueryWithPostStatus();
