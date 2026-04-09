import pool from '../server/config/database.js';

async function testExpense() {
    try {
        console.log("Starting test...");
        const company_id = 'd6797595-412e-4b3b-8378-4442a397d207'; // Default company
        
        // Find a debit and credit account
        const accs = await pool.query("SELECT id FROM accounts WHERE company_id = $1 AND is_header = false LIMIT 2", [company_id]);
        if (accs.rows.length < 2) {
            console.log("Not enough accounts to test.");
            return;
        }
        
        const debit = accs.rows[0].id;
        const credit = accs.rows[1].id;
        
        const body = {
            vendor_id: null,
            category: 'Testing',
            amount: 100,
            tax_amount: 0,
            total_amount: 100,
            payment_status: 'paid',
            payment_method: 'Cash',
            date_incurred: new Date().toISOString().split('T')[0],
            description: 'Test Expense',
            debit_account_id: debit,
            credit_account_id: credit
        };

        console.log("Simulating POST /expenses with body:", body);
        
        // Manual simulation of the route logic
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const journalRes = await client.query(
                `INSERT INTO journal_entries (company_id, transaction_date, description, source_module, reference_no)
                 VALUES ($1, $2, $3, 'expenses', $4) RETURNING id`,
                [company_id, body.date_incurred, body.description, `TEST-${Date.now()}`]
            );
            const journalId = journalRes.rows[0].id;
            console.log("Journal Entry Created:", journalId);

            await client.query(
                `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit)
                 VALUES ($1, $2, $3, $4, 0)`,
                [company_id, journalId, body.debit_account_id, body.amount]
            );

            await client.query(
                `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit)
                 VALUES ($1, $2, $3, 0, $4)`,
                [company_id, journalId, body.credit_account_id, body.total_amount]
            );

            const expenseRes = await client.query(
                `INSERT INTO expenses (
                    company_id, vendor_id, category, amount, tax_amount, total_amount, 
                    payment_status, payment_method, date_incurred, description, journal_entry_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [
                    company_id, body.vendor_id, body.category, body.amount, body.tax_amount, body.total_amount,
                    body.payment_status, body.payment_method, body.date_incurred, body.description, journalId
                ]
            );
            console.log("Expense Record Created:", expenseRes.rows[0].id);
            await client.query('COMMIT');
            console.log("Success!");
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        process.exit();
    }
}

testExpense();
