import pool from './config/database.js';
import fs from 'fs';

async function cleanup() {
  let client;
  let logStr = '';
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // List all unique indexes on ingredients
    const res = await client.query("SELECT indexname FROM pg_indexes WHERE tablename = 'ingredients' AND indexname != 'ingredients_pkey'");
    
    for (const r of res.rows) {
      logStr += `Dropping ${r.indexname}...\n`;
      await client.query(`DROP INDEX IF EXISTS "${r.indexname}"`);
    }
    
    logStr += 'Creating idx_ingredients_company_name_ci...\n';
    await client.query('CREATE UNIQUE INDEX idx_ingredients_company_name_ci ON ingredients (company_id, LOWER(name))');
    
    await client.query('COMMIT');
    logStr += 'CLEANUP SUCCESSFUL!\n';
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logStr += `CLEANUP FAILED: ${error.message}\n${error.stack}\n`;
  } finally {
    if (client) client.release();
    await pool.end();
    fs.writeFileSync('cleanup_log.txt', logStr);
    process.exit(0);
  }
}

cleanup();
