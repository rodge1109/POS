import pool from './server/config/database.js';
pool.query('SELECT * FROM employees LIMIT 1')
  .then(res => console.log(Object.keys(res.rows[0] || {})))
  .catch(err => console.error(err))
  .finally(() => process.exit(0));
