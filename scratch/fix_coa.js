import pool from '../server/config/database.js';

async function fixCOA() {
    try {
        const company_id = 'd6797595-412e-4b3b-8378-4442a397d207';
        console.log("Checking for missing account 2100...");
        
        const res = await pool.query("SELECT id FROM accounts WHERE company_id::text = $1 AND code = '2100'", [company_id]);
        if (res.rows.length === 0) {
            console.log("Account 2100 missing. Adding surgical injection...");
            await pool.query(
                `INSERT INTO accounts (company_id, code, name, type, category, is_header)
                 VALUES ($1, '2100', 'Output VAT / Sales Tax', 'Liability', 'Tax', false)`,
                [company_id]
            );
            console.log("Account 2100 successfully created.");
        } else {
            console.log("Account 2100 already exists.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

fixCOA();
