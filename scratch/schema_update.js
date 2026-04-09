import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function updateSchema() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to database.');

    // Add balance column (as numeric/decimal to handle cents)
    // The user said "int" but financial balances should usually be numeric for precision.
    // However, I will stick to "INT" as requested but maybe suggest numeric if they prefer.
    // Actually, I'll use NUMERIC(15,2) to be safe for finance, or INT if they strictly want that.
    // User specifically said "(int)". I'll use INTEGER.
    
    console.log('Adding "balance" and "as_of" columns to "accounts" table...');
    
    const query = `
      ALTER TABLE accounts 
      ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS as_of DATE;
    `;
    
    await client.query(query);
    console.log('Columns successfully added.');

    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'accounts'");
    console.log('Current accounts schema:');
    console.table(res.rows);

  } catch (err) {
    console.error('Error updating schema:', err.message);
  } finally {
    await client.end();
  }
}

updateSchema();
