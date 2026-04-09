import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' }); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'"); 
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
