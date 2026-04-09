import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'accounts'"); 
    for (const row of res.rows) {
        console.log(`${row.column_name}: ${row.data_type}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
