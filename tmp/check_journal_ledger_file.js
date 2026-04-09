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
    const res = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('journal_entries', 'ledger_entries')"); 
    let out = '';
    for (const row of res.rows) {
        out += `${row.table_name}.${row.column_name}\n`;
    }
    fs.writeFileSync('tmp/journal_ledger_cols.txt', out);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
