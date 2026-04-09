import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT id, company_id FROM orders LIMIT 3"); 
    console.log(JSON.stringify(res.rows));
    
    // Also check companies table
    const compRes = await client.query("SELECT id, name FROM companies LIMIT 3");
    console.log('Companies:', JSON.stringify(compRes.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
