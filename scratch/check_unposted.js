import pool from '../server/config/database.js';

async function checkUnposted() {
    try {
        const res = await pool.query("SELECT created_at, total_amount, posted_to_ledger FROM orders WHERE order_status != 'cancelled' AND (posted_to_ledger IS FALSE OR posted_to_ledger IS NULL) LIMIT 20");
        console.log("Unposted Orders (Sample):");
        console.table(res.rows);
        
        const counts = await pool.query("SELECT created_at::date, COUNT(*) FROM orders WHERE order_status != 'cancelled' AND (posted_to_ledger IS FALSE OR posted_to_ledger IS NULL) GROUP BY 1 ORDER BY 1");
        console.log("Unposted order counts by date:");
        console.table(counts.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkUnposted();
