import pool from '../server/config/database.js';

async function dump() {
  try {
    const companies = await pool.query('SELECT id, name FROM companies');
    const ingredients = await pool.query('SELECT id, name, company_id FROM ingredients');
    
    console.log('--- COMPANIES ---');
    console.log(JSON.stringify(companies.rows, null, 2));
    
    console.log('--- INGREDIENTS ---');
    console.log(JSON.stringify(ingredients.rows, null, 2));
    
    console.log('--- END DUMP ---');
  } catch (error) {
    console.error('Error during dump:', error);
  } finally {
    await pool.end();
  }
}

dump();
