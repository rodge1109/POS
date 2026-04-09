import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT company_id, COUNT(*) FROM accounts GROUP BY company_id"); 
    for (const row of res.rows) {
        console.log(`Company: ${row.company_id} | Count: ${row.count}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
