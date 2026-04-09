import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("UPDATE orders SET posted_to_ledger = TRUE WHERE company_id::text = 'd6797595-412e-4b3b-8378-4442a397d207'"); 
    console.log('Updated', res.rowCount, 'rows to POSTED');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
