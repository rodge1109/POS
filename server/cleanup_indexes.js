import pool from './config/database.js';

async function cleanup() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // List all unique indexes on ingredients
    const res = await client.query("SELECT indexname FROM pg_indexes WHERE tablename = 'ingredients' AND indexname != 'ingredients_pkey'");
    
    for (const r of res.rows) {
      console.log(`Dropping ${r.indexname}...`);
      await client.query(`DROP INDEX IF EXISTS "${r.indexname}"`);
    }
    
    console.log('Creating idx_ingredients_company_name_ci...');
    await client.query('CREATE UNIQUE INDEX idx_ingredients_company_name_ci ON ingredients (company_id, LOWER(name))');
    
    await client.query('COMMIT');
    console.log('CLEANUP SUCCESSFUL!');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('CLEANUP FAILED:', error);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
}

cleanup();
