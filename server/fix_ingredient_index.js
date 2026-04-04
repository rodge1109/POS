import pool from './config/database.js';

async function fixIndexes() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    console.log('Dropping ingredients_name_key (global index)...');
    await client.query('DROP INDEX IF EXISTS ingredients_name_key');
    
    console.log('Creating idx_ingredients_company_name_ci (tenant+case-insensitive index)...');
    // Using explicit table naming if needed, but 'ingredients' usually suffices in public schema
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_company_name_ci ON ingredients (company_id, LOWER(name))');
    
    await client.query('COMMIT');
    console.log('Indexes fixed successfully! Users can now add ingredients with names that might exist in other companies.');
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error fixing indexes:', error);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
}

fixIndexes();
