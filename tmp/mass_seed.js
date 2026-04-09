import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 

const defaultAccounts = [
    { code: '1000', name: 'CURRENT ASSETS', type: 'Asset', category: 'General', is_header: true },
    { code: '1001', name: 'Cash on Hand', type: 'Asset', category: 'Cash', is_header: false },
    { code: '1002', name: 'Petty Cash', type: 'Asset', category: 'Cash', is_header: false },
    { code: '1200', name: 'Inventory Asset', type: 'Asset', category: 'Inventory', is_header: false },
    { code: '2000', name: 'CURRENT LIABILITIES', type: 'Liability', category: 'General', is_header: true },
    { code: '2001', name: 'Accounts Payable', type: 'Liability', category: 'Payables', is_header: false },
    { code: '2100', name: 'Output VAT / Sales Tax', type: 'Liability', category: 'Tax', is_header: false },
    { code: '3000', name: 'EQUITY', type: 'Equity', category: 'Capital', is_header: true },
    { code: '3001', name: 'Owner Investment', type: 'Equity', category: 'Capital', is_header: false },
    { code: '3002', name: 'Owner Drawings', type: 'Equity', category: 'Drawings', is_header: false },
    { code: '3100', name: 'Retained Earnings', type: 'Equity', category: 'Retained', is_header: false },
    { code: '3900', name: 'Opening Balance Equity', type: 'Equity', category: 'Migration', is_header: false },
    { code: '4000', name: 'OPERATING REVENUE', type: 'Revenue', category: 'Sales', is_header: true },
    { code: '4001', name: 'Food & Beverage Sales', type: 'Revenue', category: 'Sales', is_header: false },
    { code: '4100', name: 'Service Charge Income', type: 'Revenue', category: 'Other Income', is_header: false },
    { code: '5000', name: 'COST OF GOODS SOLD', type: 'Expense', category: 'COGS', is_header: true },
    { code: '5001', name: 'Food Cost', type: 'Expense', category: 'COGS', is_header: false },
    { code: '6000', name: 'OPERATING EXPENSES', type: 'Expense', category: 'Operational', is_header: true },
    { code: '6001', name: 'Salaries & Wages', type: 'Expense', category: 'Labor', is_header: false },
    { code: '6002', name: 'Utility Expense', type: 'Expense', category: 'Utilities', is_header: false },
    { code: '6003', name: 'Rent Expense', type: 'Expense', category: 'Operational', is_header: false }
];

async function seed(company_id) {
    console.log('Seeding', company_id);
    const check = await client.query("SELECT id FROM accounts WHERE company_id::text = $1 LIMIT 1", [company_id]);
    if (check.rows.length > 0) {
        console.log('Already seeded', company_id);
        return;
    }
    for (const acc of defaultAccounts) {
        await client.query(
            "INSERT INTO accounts (company_id, code, name, type, category, is_header) VALUES ($1, $2, $3, $4, $5, $6)",
            [company_id, acc.code, acc.name, acc.type, acc.category, acc.is_header]
        );
    }
}

async function run() { 
  try {
    await client.connect(); 
    await seed('562b9f65-608f-455f-8340-ba9a2811b936');
    await seed('d6797595-412e-4b3b-8378-4442a397d207');
    await seed('00000000-0000-0000-0000-000000000000');
    console.log('All companies seeded.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
