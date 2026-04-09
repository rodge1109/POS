import pool from '../server/config/database.js';

async function resetPosting() {
    try {
        const company_id = 'd6797595-412e-4b3b-8378-4442a397d207';
        console.log("Resetting posted_to_ledger for all orders to allow re-testing...");
        
        const res = await pool.query(
            "UPDATE orders SET posted_to_ledger = false WHERE company_id::text = $1", 
            [company_id]
        );
        console.log(`Reset ${res.rowCount} orders.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

resetPosting();
