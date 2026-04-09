import pkg from 'pg';
import fs from 'fs';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT company_id, COUNT(*) FROM accounts GROUP BY company_id"); 
    let out = '';
    for (const row of res.rows) {
        out += `Company: ${row.company_id} | Count: ${row.count}\n`;
    }
    fs.writeFileSync('tmp/count_results.txt', out);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
