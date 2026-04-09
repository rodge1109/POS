import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'payables'"); 
    console.log(res.rows[0].count === '1' ? 'PAYABLES EXISTS' : 'PAYABLES MISSING');
    
    const res2 = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'vendors'");
    console.log(res2.rows[0].count === '1' ? 'VENDORS EXISTS' : 'VENDORS MISSING');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
