import fs from 'fs';
import pool from './server/config/database.js';

async function checkDB() {
  const companies = await pool.query('SELECT id, name FROM companies');
  const counts = await pool.query('SELECT company_id, COUNT(*) FROM ingredients GROUP BY company_id');
  const products = await pool.query('SELECT company_id, COUNT(*) FROM products GROUP BY company_id');
  
  const employees = await pool.query('SELECT id, username, company_id FROM employees');

  fs.writeFileSync('out.json', JSON.stringify({
    companies: companies.rows,
    ingredient_counts: counts.rows,
    product_counts: products.rows,
    employees: employees.rows
  }, null, 2));

  process.exit(0);
}
checkDB();
