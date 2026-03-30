import pool from './server/config/database.js';
pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('combo_items', 'order_items', 'product_composition')")
  .then(res => {
    res.rows.forEach(row => console.log(`${row.table_name}: ${row.column_name}`));
  })
  .catch(err => console.error(err))
  .finally(() => pool.end());
