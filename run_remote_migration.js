import pg from 'pg';
import fs from 'fs';

const databaseUrl = "postgresql://postgres:Ch3l3l3t110977@db.ncompzjefmmdiznhbjjc.supabase.co:5432/postgres";

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function runSingleMigration() {
  try {
    console.log('Reading migration file...');
    const sql = fs.readFileSync('./server/migration_multi_tenant.sql', 'utf8');
    
    console.log('Connecting to Supabase...');
    const client = await pool.connect();
    
    try {
      console.log('Executing migration...');
      await client.query(sql);
      console.log('Migration successful!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration crashed:');
    console.error(err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runSingleMigration();
