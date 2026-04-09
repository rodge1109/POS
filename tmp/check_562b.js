import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT COUNT(*) FROM accounts WHERE company_id::text = '562b9f65-608f-455f-8340-ba9a2811b936'"); 
    console.log('Account count for 562b:', res.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
