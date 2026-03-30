import pool from './server/config/database.js';
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'")
  .then(res => {
    console.log('Columns in orders table:');
    res.rows.forEach(row => console.log(row.column_name));
  })
  .catch(err => console.error(err))
  .finally(() => pool.end());
