import fs from 'fs';
import pool from './server/config/database.js';

pool.query('SELECT username, company_id FROM employees')
  .then(r => {
    fs.writeFileSync('temp_companies.json', JSON.stringify(r.rows, null, 2));
    process.exit(0);
  });
