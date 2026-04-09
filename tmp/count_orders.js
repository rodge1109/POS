import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT COUNT(*) FROM orders WHERE company_id::text = '00000000-0000-0000-0000-000000000000'"); 
    console.log('Zero UUID orders:', res.rows[0].count);
    
    const res2 = await client.query("SELECT COUNT(*) FROM orders WHERE company_id::text = 'd6797595-412e-4b3b-8378-4442a397d207'");
    console.log('d679 orders:', res2.rows[0].count);
    
    const res3 = await client.query("SELECT COUNT(*) FROM orders WHERE company_id::text = '562b9f65-608f-455f-8340-ba9a2811b936'");
    console.log('562b orders:', res3.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
