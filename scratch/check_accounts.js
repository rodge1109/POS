import pool from '../server/config/database.js';

async function checkAccounts() {
    try {
        const company_id = 'd6797595-412e-4b3b-8378-4442a397d207';
        const res = await pool.query("SELECT code, name FROM accounts WHERE company_id::text = $1 AND code IN ('1001', '4000', '5000', '2100')", [company_id]);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkAccounts();
