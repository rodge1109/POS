import pool from './server/config/database.js';

async function checkNames() {
  try {
    const productsRes = await pool.query("SELECT id, name FROM products WHERE name ILIKE '%lemonade%'");
    console.log("PRODUCTS:");
    console.table(productsRes.rows);

    const ingredientsRes = await pool.query("SELECT id, name FROM ingredients WHERE name ILIKE '%lemonade%'");
    console.log("INGREDIENTS:");
    console.table(ingredientsRes.rows);

    const compositionRes = await pool.query(`
      SELECT pc.id, p.name as product, i.name as ingredient 
      FROM product_composition pc
      JOIN products p ON pc.product_id = p.id
      JOIN ingredients i ON pc.ingredient_id = i.id
      WHERE p.name ILIKE '%lemonade%'
    `);
    console.log("EXISTING RECIPES:");
    console.table(compositionRes.rows);

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
checkNames();
