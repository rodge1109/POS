import pool from './config/database.js';
import fs from 'fs';

async function cleanup() {
  let client;
  let logStr = '';
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    console.log('Fetching constraints for ingredients...');
    const constRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'ingredients'::regclass AND contype = 'u'
    `);
    
    for (const r of constRes.rows) {
      logStr += `Dropping constraint ${r.conname}...\n`;
      await client.query(`ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS "${r.conname}" CASCADE`);
    }

    // Also drop the indices directly just in case they were created separately
    const res = await client.query("SELECT indexname FROM pg_indexes WHERE tablename = 'ingredients' AND indexname NOT LIKE '%pkey%'");
    for (const r of res.rows) {
      logStr += `Dropping index ${r.indexname}...\n`;
      await client.query(`DROP INDEX IF EXISTS "${r.indexname}" CASCADE`);
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
    fs.writeFileSync('cleanup_log_v3.txt', logStr);
    process.exit(0);
  }
}

cleanup();
