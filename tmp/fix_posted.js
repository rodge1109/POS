import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' }); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("UPDATE orders SET posted_to_ledger = TRUE WHERE company_id::text = '562b9f65-608f-455f-8340-ba9a2811b936'"); 
    console.log('Updated', res.rowCount, 'rows'); 
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
