import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT COUNT(*) FROM accounts WHERE company_id::text = 'd6797595-412e-4b3b-8378-4442a397d207'"); 
    console.log('Account count for d679:', res.rows[0].count);
    
    // Check if there are any accounts at all
    const res2 = await client.query("SELECT company_id, count(*) FROM accounts GROUP BY company_id");
    console.log('Acounts per company:', JSON.stringify(res2.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
