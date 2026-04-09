import pool from '../config/database.js';

/**
 * Records a double-entry journal/ledger transaction
 * @param {Object} client - DB Client (for transactions)
 * @param {Object} entryData - Data for the journal entry
 */
export const recordJournalTransaction = async (client, {
    company_id,
    date,
    description,
    source_module,
    reference_no,
    debits = [], // Array of { account_id, amount }
    credits = [] // Array of { account_id, amount }
}) => {
    // 1. Create Journal Entry
    const journalRes = await client.query(
        `INSERT INTO journal_entries (company_id, transaction_date, description, source_module, reference_no)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [company_id, date || new Date(), description, source_module, reference_no]
    );
    const journalId = journalRes.rows[0].id;

    // 2. Create Ledger Entries
    for (const debit of debits) {
        await client.query(
            `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit)
             VALUES ($1, $2, $3, $4, 0)`,
            [company_id, journalId, debit.account_id, debit.amount]
        );
    }

    for (const credit of credits) {
        await client.query(
            `INSERT INTO ledger_entries (company_id, journal_entry_id, account_id, debit, credit)
             VALUES ($1, $2, $3, 0, $4)`,
            [company_id, journalId, credit.account_id, credit.amount]
        );
    }

    return journalId;
};

/**
 * Finds account IDs by code for a company
 * @param {string} company_id 
 * @param {Array} codes 
 */
export const getAccountIdsByCodes = async (client, company_id, codes) => {
    const result = await client.query(
        "SELECT id, code FROM accounts WHERE company_id::text = $1::text AND code = ANY($2)",
        [company_id, codes]
    );
    const mapping = {};
    result.rows.forEach(row => {
        mapping[row.code] = row.id;
    });
    return mapping;
};

/**
 * Automatically records Sales Revenue and Cash/Payment entry
 */
export const recordSalesTransaction = async (client, companyId, order) => {
    const codes = ['1001', '4000']; // Cash on Hand, Sales Revenue
    const accounts = await getAccountIdsByCodes(client, companyId, codes);
    
    // Check for payment method (e.g. GCash 1102)
    let debitAccountId = accounts['1001'];
    if (order.payment_method === 'GCash' || order.payment_method === 'gcash') {
        const gcash = await getAccountIdsByCodes(client, companyId, ['1102']);
        if (gcash['1102']) debitAccountId = gcash['1102'];
    }

    const debits = [{ account_id: debitAccountId, amount: order.total_amount }];
    const credits = [{ account_id: accounts['4000'], amount: order.total_amount }];
    
    return recordJournalTransaction(client, {
        company_id: companyId,
        date: new Date(),
        description: `Sale: ${order.order_number}`,
        source_module: 'pos',
        reference_no: order.order_number,
        debits,
        credits
    });
};

/**
 * Automatically records COGS and Inventory deduction entry
 */
export const recordCOGSTransaction = async (client, companyId, order, items) => {
    const codes = ['5000', '1200']; // COGS, Inventory
    const accounts = await getAccountIdsByCodes(client, companyId, codes);
    
    // Calculate Total COGS from DB to ensure integrity
    const productIds = items.filter(i => !i.isCombo).map(i => {
        const id = i.product_id || i.id;
        return typeof id === 'string' && id.startsWith('combo-') ? null : parseInt(id);
    }).filter(id => id !== null && !isNaN(id));

    const comboIds = items.filter(i => i.isCombo).map(i => {
        const id = i.combo_id || i.id;
        return typeof id === 'string' && id.startsWith('combo-') ? parseInt(id.replace('combo-', '')) : parseInt(id);
    }).filter(id => !isNaN(id));
    
    let totalCost = 0;
    
    if (productIds.length > 0) {
        const pResult = await client.query(
            "SELECT id, cost FROM products WHERE id = ANY($1)", 
            [productIds]
        );
        const costMap = {};
        pResult.rows.forEach(r => costMap[r.id] = parseFloat(r.cost || 0));
        
        items.filter(i => !i.isCombo).forEach(item => {
            const id = item.product_id || item.id;
            totalCost += (costMap[id] || 0) * Number(item.quantity || 0);
        });
    }
    
    if (comboIds.length > 0) {
        const cResult = await client.query(
            `SELECT ci.combo_id, SUM(p.cost * ci.quantity) as combo_cost
             FROM combo_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.combo_id = ANY($1)
             GROUP BY ci.combo_id`,
            [comboIds]
        );
        const comboCostMap = {};
        cResult.rows.forEach(r => comboCostMap[r.combo_id] = parseFloat(r.combo_cost || 0));
        
        items.filter(i => i.isCombo).forEach(item => {
            const id = item.combo_id || item.id;
            const numericId = typeof id === 'string' && id.startsWith('combo-') ? parseInt(id.replace('combo-', '')) : id;
            totalCost += (comboCostMap[numericId] || 0) * Number(item.quantity || 0);
        });
    }

    if (totalCost > 0) {
        return recordJournalTransaction(client, {
            company_id: companyId,
            date: new Date(),
            description: `COGS: ${order.order_number}`,
            source_module: 'inventory',
            reference_no: order.order_number,
            debits: [{ account_id: accounts['5000'], amount: totalCost }],
            credits: [{ account_id: accounts['1200'], amount: totalCost }]
        });
    }
    return null;
};
