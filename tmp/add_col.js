import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' }); 
async function run() { 
  try {
    await client.connect(); 
    await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS posted_to_ledger BOOLEAN DEFAULT FALSE;"); 
    console.log('Column added successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
