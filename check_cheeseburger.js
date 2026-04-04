import pool from './server/config/database.js';
async function run() {
  try {
    const products = await pool.query("SELECT id, name, stock_quantity, low_stock_threshold FROM products WHERE name ILIKE '%Cheese%'");
    console.log("Products:");
    console.table(products.rows);

    if (products.rows.length > 0) {
      const pid = products.rows[0].id;
      const comps = await pool.query("SELECT * FROM product_composition WHERE product_id = $1", [pid]);
      console.log("Recipe for " + products.rows[0].name + ":");
      console.table(comps.rows);
      
      const trans = await pool.query("SELECT * FROM inventory_transactions WHERE product_id = $1 ORDER BY created_at DESC LIMIT 5", [pid]);
      console.log("Recent Transactions for this Product:");
      console.table(trans.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
