import pool from '../server/config/database.js';

async function findEmployees() {
  try {
    const storePin = '886842';
    // 1. Find the company id
    const companyRes = await pool.query('SELECT id, name FROM companies WHERE login_pin = $1', [storePin]);
    
    if (companyRes.rows.length === 0) {
      console.log('No company found with PIN 886842');
      process.exit(0);
    }
    
    const companyId = companyRes.rows[0].id;
    console.log(`Company: ${companyRes.rows[0].name} (ID: ${companyId})`);
    
    // 2. Find employees for this company
    const empRes = await pool.query('SELECT * FROM employees WHERE company_id = $1', [companyId]);
    
    if (empRes.rows.length === 0) {
      console.log('No employees found for this company.');
    } else {
      console.log('Employees found:', empRes.rows.length);
      empRes.rows.forEach(emp => {
        console.log(`- ${emp.name} (Role: ${emp.role}, Active: ${emp.active}, PIN: "${emp.pin}")`);
      });

      // Simulate login query
      const pinToTest = '1122';
      const loginQuery = 'SELECT id, name FROM employees WHERE "PIN"::text = $1 AND company_id = $2 AND active = true';
      const loginRes = await pool.query(loginQuery, [pinToTest, companyId]);
      console.log(`Login test for PIN ${pinToTest}: ${loginRes.rows.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

findEmployees();
