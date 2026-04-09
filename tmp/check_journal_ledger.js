import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ 
  connectionString: 'postgresql://postgres.ncompzjefmmdiznhbjjc:Ch3l3l3t110977@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
}); 
async function run() { 
  try {
    await client.connect(); 
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries'"); 
    console.log('journal_entries columns:', res.rows.map(r => r.column_name).join(', '));
    
    const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ledger_entries'");
    console.log('ledger_entries columns:', res2.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end(); 
  }
} 
run();
