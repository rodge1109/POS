import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// 1. Get Chart of Accounts
router.get('/accounts', async (req, res) => {
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const result = await pool.query(
            `SELECT a.*, 
                COALESCE(SUM(le.debit), 0) as total_debit, 
                COALESCE(SUM(le.credit), 0) as total_credit,
                CASE 
                    WHEN a.type IN ('Asset', 'Expense') THEN COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0)
                    ELSE COALESCE(SUM(le.credit), 0) - COALESCE(SUM(le.debit), 0)
                END as balance
             FROM accounts a
             LEFT JOIN ledger_entries le ON a.id = le.account_id
             WHERE a.company_id = $1 AND a.active = TRUE
             GROUP BY a.id
             ORDER BY a.code ASC`,
            [company_id]
        );
        res.json({ success: true, accounts: result.rows });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 1.1 Create Account
router.post('/accounts', async (req, res) => {
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const { code, name, type, category, parent_id, is_header = false } = req.body;
        
        const result = await pool.query(
            `INSERT INTO accounts (company_id, code, name, type, category, parent_id, is_header)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [company_id, code, name, type, category, parent_id || null, is_header]
        );
        res.json({ success: true, account: result.rows[0] });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 1.2 Update Account
router.put('/accounts/:id', async (req, res) => {
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const { id } = req.params;
        const { code, name, type, category, parent_id, is_header, active } = req.body;
        
        const result = await pool.query(
            `UPDATE accounts SET 
                code = COALESCE($1, code),
                name = COALESCE($2, name),
                type = COALESCE($3, type),
                category = COALESCE($4, category),
                parent_id = $5,
                is_header = COALESCE($6, is_header),
                active = COALESCE($7, active)
             WHERE id = $8 AND company_id = $9 RETURNING *`,
            [code, name, type, category, parent_id || null, is_header, active, id, company_id]
        );
        res.json({ success: true, account: result.rows[0] });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 1.3 Delete Account (only if no ledger entries exist)
router.delete('/accounts/:id', async (req, res) => {
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const { id } = req.params;
        
        // Check for ledger entries
        const ledgerCheck = await pool.query(
            "SELECT id FROM ledger_entries WHERE account_id = $1 AND company_id = $2 LIMIT 1",
            [id, company_id]
        );
        
        if (ledgerCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete account with existing transactions. Deactivate it instead.' });
        }
        
        await pool.query("DELETE FROM accounts WHERE id = $1 AND company_id = $2", [id, company_id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Get Vendors
router.get('/vendors', async (req, res) => {
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const result = await pool.query(
            "SELECT * FROM vendors WHERE company_id = $1 ORDER BY name ASC",
            [company_id]
        );
        res.json({ success: true, vendors: result.rows });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 2.1 Get Payables (Outstanding)
router.get('/payables', async (req, res) => {
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const result = await pool.query(
            `SELECT p.*, v.name as vendor_name
             FROM payables p
             JOIN vendors v ON p.vendor_id = v.id
             WHERE p.company_id = $1 AND p.status != 'paid'
             ORDER BY p.due_date ASC`,
            [company_id]
        );
        res.json({ success: true, payables: result.rows });
    } catch (error) {
        console.error('Error fetching payables:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 3. Record an Expense
router.post('/expenses', async (req, res) => {
    const client = await pool.connect();
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const { 
            vendor_id, 
            category, 
            amount, 
            tax_amount = 0, 
            total_amount, 
            payment_status, 
            payment_method, 
            date_incurred, 
            description,
            debit_account_id,
            credit_account_id
        } = req.body;

        const parseSafeId = (val) => {
            if (val === '' || val === null || val === undefined || val === 'null' || val === 'undefined') return null;
            return val;
        };

        const safe_vendor_id = parseSafeId(vendor_id);
        const safe_debit_id = parseSafeId(debit_account_id);
        const safe_credit_id = parseSafeId(credit_account_id);

        if (!date_incurred) {
            return res.status(400).json({ success: false, error: 'Protocol date is required.' });
        }

        if (!safe_debit_id || !safe_credit_id) {
            return res.status(400).json({ success: false, error: 'Debit and Credit accounts are required for ledger injection.' });
        }

        if (isNaN(parseFloat(amount)) || isNaN(parseFloat(total_amount))) {
            return res.status(400).json({ success: false, error: 'Invalid financial quantum detected.' });
        }

        await client.query('BEGIN');

        // A. Create Journal Entry
        const journalRes = await client.query(
            `INSERT INTO journal_entries (company_id, transaction_date, description, source_module, reference_no)
             VALUES ($1, $2, $3, 'expenses', $4) RETURNING id`,
            [company_id, date_incurred, description || `Expense: ${category}`, req.body.reference_no || `EXP-${Date.now()}`]
        );
        const journalId = journalRes.rows[0].id;

        // B. Create Ledger Entries (Double Entry)
        // Debit the Expense/Asset Account
        await client.query(
            `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit)
             VALUES ($1, $2, $3, $4, 0)`,
            [company_id, journalId, safe_debit_id, amount]
        );

        // Credit the Payment/Liability Account
        await client.query(
            `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit)
             VALUES ($1, $2, $3, 0, $4)`,
            [company_id, journalId, safe_credit_id, total_amount]
        );

        // C. Create Expense Record
        const expenseRes = await client.query(
            `INSERT INTO expenses (
                company_id, vendor_id, category, amount, tax_amount, total_amount, 
                payment_status, payment_method, date_incurred, description, journal_entry_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                company_id, safe_vendor_id, category, amount, tax_amount, total_amount,
                payment_status, payment_method, date_incurred, description, journalId
            ]
        );

        await client.query('COMMIT');
        res.json({ success: true, expense: expenseRes.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recording expense:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// 3.2 Get Master Journal (All Transactions)
router.get('/journal', async (req, res) => {
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        const result = await pool.query(
            `SELECT 
                je.id as journal_id, 
                je.transaction_date as date, 
                je.description, 
                je.reference_no, 
                je.source_module,
                le.id as ledger_id,
                le.debit,
                le.credit,
                a.name as account_name,
                a.code as account_code
             FROM journal_entries je
             JOIN ledger_entries le ON je.id = le.journal_entry_id
             JOIN accounts a ON le.account_id = a.id
             WHERE je.company_id = $1
             ORDER BY je.transaction_date DESC, je.id DESC, le.debit DESC`,
            [company_id]
        );
        res.json({ success: true, journal: result.rows });
    } catch (error) {
        console.error('Error fetching journal:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 4. Generate Profit & Loss (P&L) Report
router.get('/reports/pl', async (req, res) => {
    try {
        const { start, end } = req.query;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        // Fetch aggregation of Revenue and Expenses from ledger with LEFT JOIN to show zero balances
        const result = await pool.query(
            `SELECT a.type, a.name, a.code, 
                    COALESCE(SUM(le.credit), 0) - COALESCE(SUM(le.debit), 0) as balance
             FROM accounts a
             LEFT JOIN ledger_entries le ON a.id = le.account_id AND le.company_id::text = $1::text
             LEFT JOIN journal_entries je ON le.journal_entry_id = je.id 
                AND je.transaction_date >= $2 AND je.transaction_date <= $3
             WHERE a.company_id::text = $1::text 
               AND a.type IN ('Revenue', 'Expense')
               AND a.is_header = false
             GROUP BY a.type, a.name, a.code
             ORDER BY a.type DESC, a.code ASC`,
            [company_id, start, end]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error generating P&L:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 4.1. Generate Balance Sheet
router.get('/reports/balance-sheet', async (req, res) => {
    try {
        const { date = new Date() } = req.query;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        // 1. Get physical balances of Assets, Liabilities, and Equity accounts
        const physicalResult = await pool.query(
            `SELECT a.type, a.name, a.code, 
                    COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0) as balance
             FROM accounts a
             LEFT JOIN ledger_entries le ON a.id = le.account_id AND le.company_id::text = $1::text
             LEFT JOIN journal_entries je ON le.journal_entry_id = je.id AND je.transaction_date <= $2
             WHERE a.company_id::text = $1::text 
               AND a.type IN ('Asset', 'Liability', 'Equity')
               AND a.is_header = false
             GROUP BY a.type, a.name, a.code`,
            [company_id, date]
        );

        // 2. Calculate Net Income (Revenue - Expenses) up to this date
        // Note: For display we use Credit - Debit for Rev, Debit - Credit for Exp.
        // Net Income = SUM(Revenue Credits - Revenue Debits) - SUM(Expense Debits - Expense Credits)
        const niResult = await pool.query(
            `SELECT 
                SUM(CASE WHEN a.type = 'Revenue' THEN le.credit - le.debit ELSE 0 END) -
                SUM(CASE WHEN a.type = 'Expense' THEN le.debit - le.credit ELSE 0 END) as net_income
             FROM accounts a
             JOIN ledger_entries le ON a.id = le.account_id
             JOIN journal_entries je ON le.journal_entry_id = je.id
             WHERE a.company_id::text = $1::text 
               AND je.transaction_date <= $2
               AND a.type IN ('Revenue', 'Expense')`,
            [company_id, date]
        );

        const netIncome = parseFloat(niResult.rows[0].net_income || 0);
        const data = physicalResult.rows;

        // Add Net Income as a virtual Equity account for balancing
        data.push({
            type: 'Equity',
            name: 'Net Income (YTD)',
            code: '3999',
            balance: -netIncome // We use Asset-centric balance (D-C), so Equity is negative if positive balance
        });

        res.json({ success: true, data: data.sort((a,b) => a.type.localeCompare(b.type) || a.code.localeCompare(b.code)) });
    } catch (error) {
        console.error('Error generating Balance Sheet:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 4.2. Generate Cash Flow Statement (Simplified)
router.get('/reports/cash-flow', async (req, res) => {
    try {
        const { start, end } = req.query;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        // Simplified Cash Flow: Track changes in Cash accounts (Asset type, Cash category)
        const result = await pool.query(
            `SELECT je.transaction_date as date, je.description, je.reference_no,
                    COALESCE(le.debit, 0) as inflow, COALESCE(le.credit, 0) as outflow,
                    (COALESCE(le.debit, 0) - COALESCE(le.credit, 0)) as net_change,
                    a.name as account_name
             FROM ledger_entries le
             JOIN accounts a ON le.account_id = a.id
             JOIN journal_entries je ON le.journal_entry_id = je.id
             WHERE le.company_id::text = $1::text 
               AND je.transaction_date >= $2 AND je.transaction_date <= $3
               AND (a.code LIKE '10%' OR a.code LIKE '11%') -- Cash and Bank accounts
             ORDER BY je.transaction_date ASC, je.created_at ASC`,
            [company_id, start, end]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error generating Cash Flow:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 4.3. Expense Summary
router.get('/reports/expenses-summary', async (req, res) => {
    try {
        const { start, end } = req.query;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        const result = await pool.query(
            `SELECT category, SUM(total_amount) as total, COUNT(*) as count
             FROM expenses
             WHERE company_id::text = $1::text 
               AND date_incurred >= $2 AND date_incurred <= $3
             GROUP BY category
             ORDER BY total DESC`,
            [company_id, start, end]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching expense summary:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// 5. Daily Sales Posting (Manual Intervention)
router.get('/reports/daily-summary', async (req, res) => {
    try {
        const { date = new Date().toISOString().split('T')[0] } = req.query;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        // Get total sales and total items (for COGS calculation) for unposted orders
        const salesResult = await pool.query(
            `SELECT 
                COUNT(*) as order_count,
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(tax_amount), 0) as total_tax,
                COALESCE(SUM(discount_amount), 0) as total_discount
             FROM orders 
             WHERE company_id::text = $1::text
               AND (created_at::timestamptz AT TIME ZONE 'Asia/Manila')::date = $2::date
               AND order_status != 'cancelled'
               AND (posted_to_ledger IS FALSE OR posted_to_ledger IS NULL)`,
            [company_id, date]
        );

        // Calculate COGS for these unposted orders
        const cogsResult = await pool.query(
            `SELECT 
                COALESCE(SUM(p.cost_price * oi.quantity), 0) as total_cogs
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             JOIN products p ON oi.product_id = p.id
             WHERE o.company_id::text = $1::text
               AND (o.created_at::timestamptz AT TIME ZONE 'Asia/Manila')::date = $2::date
               AND o.order_status != 'cancelled'
               AND (o.posted_to_ledger IS FALSE OR o.posted_to_ledger IS NULL)`,
            [company_id, date]
        );

        // 3. Get the list of orders
        const ordersResult = await pool.query(
            `SELECT id, order_number, total_amount, created_at
             FROM orders
             WHERE company_id::text = $1::text
               AND (created_at::timestamptz AT TIME ZONE 'Asia/Manila')::date = $2::date
               AND order_status != 'cancelled'
               AND (posted_to_ledger IS FALSE OR posted_to_ledger IS NULL)
             ORDER BY created_at DESC`,
            [company_id, date]
        );

        res.json({ 
            success: true, 
            data: {
                ...salesResult.rows[0],
                ...cogsResult.rows[0],
                orders: ordersResult.rows,
                date
            }
        });
    } catch (error) {
        console.error('Error fetching daily summary:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/reports/post-daily', async (req, res) => {
    const client = await pool.connect();
    try {
        const { date } = req.body;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        await client.query('BEGIN');

        // 1. Re-calculate totals to ensure accuracy
        const summaryRes = await client.query(
            `SELECT 
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(tax_amount), 0) as total_tax
             FROM orders 
             WHERE company_id::text = $1::text
               AND (created_at::timestamptz AT TIME ZONE 'Asia/Manila')::date = $2::date
               AND order_status != 'cancelled'
               AND (posted_to_ledger IS FALSE OR posted_to_ledger IS NULL)`,
            [company_id, date]
        );

        const cogsRes = await client.query(
            `SELECT 
                COALESCE(SUM(p.cost_price * oi.quantity), 0) as total_cogs
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             JOIN products p ON oi.product_id = p.id
             WHERE o.company_id::text = $1::text
               AND (o.created_at::timestamptz AT TIME ZONE 'Asia/Manila')::date = $2::date
               AND o.order_status != 'cancelled'
               AND (o.posted_to_ledger IS FALSE OR o.posted_to_ledger IS NULL)`,
            [company_id, date]
        );

        const sales = parseFloat(summaryRes.rows[0].total_sales);
        const tax = parseFloat(summaryRes.rows[0].total_tax);
        const cogs = parseFloat(cogsRes.rows[0].total_cogs);

        console.log(`[DailyPost] Auditing ${date}: Sales=${sales}, Tax=${tax}, COGS=${cogs}`);

        if (sales === 0 && cogs === 0) {
            console.log(`[DailyPost] Audit failed: No unposted transactions for ${date}`);
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'No unposted transactions found for this date.' });
        }

        // 2. Fetch Account IDs
        const accountsRes = await client.query(
            `SELECT id, code FROM accounts WHERE company_id::text = $1::text AND code IN ('1001', '4000', '5000', '1200', '2100')`,
            [company_id]
        );
        const accounts = {};
        accountsRes.rows.forEach(a => accounts[a.code] = a.id);

        const cashAcc = accounts['1001'];
        const salesAcc = accounts['4000'];
        const cogsAcc = accounts['5000'];
        const inventoryAcc = accounts['1200'];
        const taxAcc = accounts['2100'];

        console.log(`[DailyPost] Accounts Resolution: Cash=${cashAcc}, Sales=${salesAcc}, COGS=${cogsAcc}, Inventory=${inventoryAcc}, Tax=${taxAcc}`);

        if (!cashAcc || !salesAcc || !cogsAcc || !inventoryAcc || !taxAcc) {
            console.log(`[DailyPost] Resolution failure: Missing required accounts in COA`);
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                error: 'Required accounts (1001-Cash, 4000-Sales, 5000-COGS, 1200-Inventory, 2100-Tax) not found.' 
            });
        }

        // 3. Record Combined Sales, Tax & COGS Entry
        if (sales > 0 || cogs > 0 || tax > 0) {
            console.log(`[DailyPost] Injecting Journal Entry...`);
            const jeSales = await client.query(
                `INSERT INTO journal_entries (company_id, transaction_date, description, reference_no, source_module)
                 VALUES ($1, $2, $3, $4, 'pos') RETURNING id`,
                [company_id, date, `Daily Sales & COGS Summary - ${date}`, `DSS-${date.replace(/-/g, '')}`]
            );
            const jeId = jeSales.rows[0].id;
            console.log(`[DailyPost] Journal Entry Created: ID=${jeId}`);

            // A. SALES & CASH INJECTION
            // Debit Cash (Total Sales - which includes tax)
            if (sales > 0) {
                await client.query(
                    `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4, 0)`,
                    [company_id, jeId, cashAcc, sales]
                );
            }

            // Credit Tax Payable (Output VAT)
            if (tax > 0) {
                await client.query(
                    `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0, $4)`,
                    [company_id, jeId, taxAcc, tax]
                );
            }

            // Credit Sales (Net of Tax)
            const netSales = sales - tax;
            if (netSales > 0) {
                await client.query(
                    `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0, $4)`,
                    [company_id, jeId, salesAcc, netSales]
                );
            }

            // B. COGS & INVENTORY REDUCTION
            if (cogs > 0) {
                // Debit COGS
                await client.query(
                    `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4, 0)`,
                    [company_id, jeId, cogsAcc, cogs]
                );
                // Credit Inventory
                await client.query(
                    `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0, $4)`,
                    [company_id, jeId, inventoryAcc, cogs]
                );
            }
        }

        // 5. Mark orders as posted
        console.log(`[DailyPost] Finalizing: Marking orders as posted...`);
        await client.query(
            `UPDATE orders SET posted_to_ledger = TRUE 
             WHERE company_id::text = $1::text
               AND (created_at::timestamptz AT TIME ZONE 'Asia/Manila')::date = $2::date
               AND (posted_to_ledger IS FALSE OR posted_to_ledger IS NULL)`,
            [company_id, date]
        );

        await client.query('COMMIT');
        console.log(`[DailyPost] Protocol Success: Commited.`);
        res.json({ success: true, message: 'Daily summary posted successfully' });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('[DailyPost] Protocol CRUSH:', error);
        res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
    } finally {
        client.release();
    }
});

// 6. Opening Balances
router.post('/accounts/:id/opening-balance', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { amount, date = new Date().toISOString().split('T')[0] } = req.body;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        await client.query('BEGIN');

        // 1. Get the target account
        const accountRes = await client.query(
            "SELECT * FROM accounts WHERE id = $1 AND company_id = $2",
            [id, company_id]
        );
        if (accountRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        const account = accountRes.rows[0];

        // 2. Ensure Opening Balance Equity account exists (Code 3000)
        let equityRes = await client.query(
            "SELECT id FROM accounts WHERE code = '3000' AND company_id = $1",
            [company_id]
        );
        let equityId;
        if (equityRes.rows.length === 0) {
            const newEquity = await client.query(
                `INSERT INTO accounts (company_id, code, name, type, category, is_header)
                 VALUES ($1, '3000', 'Opening Balance Equity', 'Equity', 'Capital', false) RETURNING id`,
                [company_id]
            );
            equityId = newEquity.rows[0].id;
        } else {
            equityId = equityRes.rows[0].id;
        }

        // 3. Create Journal Entry
        const jeRes = await client.query(
            `INSERT INTO journal_entries (company_id, transaction_date, description, reference_no, source_module)
             VALUES ($1, $2, $3, $4, 'manual') RETURNING id`,
            [company_id, date, `Opening Balance - ${account.name}`, `OB-${account.code}`]
        );
        const jeId = jeRes.rows[0].id;

        const val = parseFloat(amount);
        // Normal balances:
        // Assets/Expenses: Debit +
        // Liabilities/Equity/Revenue: Credit +
        const isDebitNormal = ['Asset', 'Expense'].includes(account.type);

        if (isDebitNormal) {
            // Debit the Asset, Credit Opening Balance Equity
            await client.query(
                `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4, 0)`,
                [company_id, jeId, account.id, val]
            );
            await client.query(
                `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0, $4)`,
                [company_id, jeId, equityId, val]
            );
        } else {
            // Credit the Liability/Equity, Debit Opening Balance Equity
            await client.query(
                `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0, $4)`,
                [company_id, jeId, account.id, val]
            );
            await client.query(
                `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4, 0)`,
                [company_id, jeId, equityId, val]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Opening balance set successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error setting opening balance:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// 7. Batch Opening Balances (Migration Assistant)
router.post('/accounts/batch-opening-balance', async (req, res) => {
    const client = await pool.connect();
    try {
        const { entries, date = new Date().toISOString().split('T')[0] } = req.body;
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ success: false, error: 'No entries provided' });
        }

        await client.query('BEGIN');

        // 1. Ensure Opening Balance Equity account exists (Code 3000)
        let equityRes = await client.query(
            "SELECT id FROM accounts WHERE code = '3000' AND company_id = $1",
            [company_id]
        );
        let equityId;
        if (equityRes.rows.length === 0) {
            const newEquity = await client.query(
                `INSERT INTO accounts (company_id, code, name, type, category, is_header)
                 VALUES ($1, '3000', 'Opening Balance Equity', 'Equity', 'Capital', false) RETURNING id`,
                [company_id]
            );
            equityId = newEquity.rows[0].id;
        } else {
            equityId = equityRes.rows[0].id;
        }

        // 2. Create Master Migration Journal Entry
        const jeRes = await client.query(
            `INSERT INTO journal_entries (company_id, transaction_date, description, reference_no, source_module)
             VALUES ($1, $2, 'Initial Financial Migration - Batch Import', 'MIG-BATCH', 'manual') RETURNING id`,
            [company_id, date]
        );
        const jeId = jeRes.rows[0].id;

        let totalEquityOffset = 0;

        for (const entry of entries) {
            const { account_id, amount } = entry;
            const val = parseFloat(amount);
            if (isNaN(val) || val === 0) continue;

            const accRes = await client.query("SELECT * FROM accounts WHERE id = $1", [account_id]);
            if (accRes.rows.length === 0) continue;
            const account = accRes.rows[0];

            const isDebitNormal = ['Asset', 'Expense'].includes(account.type);

            if (isDebitNormal) {
                // Asset + -> Debit
                await client.query(
                    `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4, 0)`,
                    [company_id, jeId, account_id, val]
                );
                totalEquityOffset -= val; // Assets increase equity on offset
            } else {
                // Liability/Equity + -> Credit
                await client.query(
                    `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, 0, $4)`,
                    [company_id, jeId, account_id, val]
                );
                totalEquityOffset += val;
            }
        }

        // 3. Balance the entry using the Equity account
        if (totalEquityOffset !== 0) {
            const debit = totalEquityOffset > 0 ? totalEquityOffset : 0;
            const credit = totalEquityOffset < 0 ? Math.abs(totalEquityOffset) : 0;
            
            await client.query(
                `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit) VALUES ($1, $2, $3, $4, $5)`,
                [company_id, jeId, equityId, debit, credit]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Migration batch processed successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch OB error:', error);
        res.status(500).json({ success: false, error: 'Migration failed' });
    } finally {
        client.release();
    }
});

// 8. Initialize Default Chart of Accounts
router.post('/accounts/initialize-defaults', async (req, res) => {
    const client = await pool.connect();
    try {
        const company_id = req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207';
        
        // 1. Check if accounts already exist
        const checkRes = await client.query("SELECT id FROM accounts WHERE company_id = $1 LIMIT 1", [company_id]);
        if (checkRes.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Accounts already exist for this company.' });
        }

        await client.query('BEGIN');

        const defaultAccounts = [
            // ASSETS
            { code: '1000', name: 'CURRENT ASSETS', type: 'Asset', category: 'General', is_header: true },
            { code: '1001', name: 'Cash on Hand', type: 'Asset', category: 'Cash', is_header: false },
            { code: '1002', name: 'Petty Cash', type: 'Asset', category: 'Cash', is_header: false },
            { code: '1200', name: 'Inventory Asset', type: 'Asset', category: 'Inventory', is_header: false },
            
            // LIABILITIES
            { code: '2000', name: 'CURRENT LIABILITIES', type: 'Liability', category: 'General', is_header: true },
            { code: '2001', name: 'Accounts Payable', type: 'Liability', category: 'Payables', is_header: false },
            { code: '2100', name: 'Output VAT / Sales Tax', type: 'Liability', category: 'Tax', is_header: false },
            
            // EQUITY
            { code: '3000', name: 'EQUITY', type: 'Equity', category: 'Capital', is_header: true },
            { code: '3001', name: 'Owner Investment', type: 'Equity', category: 'Capital', is_header: false },
            { code: '3002', name: 'Owner Drawings', type: 'Equity', category: 'Drawings', is_header: false },
            { code: '3100', name: 'Retained Earnings', type: 'Equity', category: 'Retained', is_header: false },
            { code: '3900', name: 'Opening Balance Equity', type: 'Equity', category: 'Migration', is_header: false },

            // REVENUE
            { code: '4000', name: 'OPERATING REVENUE', type: 'Revenue', category: 'Sales', is_header: true },
            { code: '4001', name: 'Food & Beverage Sales', type: 'Revenue', category: 'Sales', is_header: false },
            { code: '4100', name: 'Service Charge Income', type: 'Revenue', category: 'Other Income', is_header: false },

            // EXPENSES
            { code: '5000', name: 'COST OF GOODS SOLD', type: 'Expense', category: 'COGS', is_header: true },
            { code: '5001', name: 'Food Cost', type: 'Expense', category: 'COGS', is_header: false },
            { code: '6000', name: 'OPERATING EXPENSES', type: 'Expense', category: 'Operational', is_header: true },
            { code: '6001', name: 'Salaries & Wages', type: 'Expense', category: 'Labor', is_header: false },
            { code: '6002', name: 'Utility Expense', type: 'Expense', category: 'Utilities', is_header: false },
            { code: '6003', name: 'Rent Expense', type: 'Expense', category: 'Operational', is_header: false }
        ];

        for (const acc of defaultAccounts) {
            await client.query(
                `INSERT INTO accounts (company_id, code, name, type, category, is_header)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [company_id, acc.code, acc.name, acc.type, acc.category, acc.is_header]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Default Chart of Accounts initialized successfully.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error initializing COA:', error);
        res.status(500).json({ success: false, error: 'Initialization failed' });
    } finally {
        client.release();
    }
});

export default router;
