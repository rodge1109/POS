import pool from './server/config/database.js';

async function checkNames() {
  try {
    const productsRes = await pool.query("SELECT id, name, company_id FROM products WHERE name ILIKE '%lemonade%'");
    console.log("PRODUCTS:");
    console.log(JSON.stringify(productsRes.rows, null, 2));

    const ingredientsRes = await pool.query("SELECT id, name, company_id FROM ingredients WHERE name ILIKE '%lemonade%'");
    console.log("INGREDIENTS:");
    console.log(JSON.stringify(ingredientsRes.rows, null, 2));

    const compositionRes = await pool.query(`
      SELECT pc.id, p.name as product, i.name as ingredient, pc.company_id
      FROM product_composition pc
      JOIN products p ON pc.product_id = p.id
      JOIN ingredients i ON pc.ingredient_id = i.id
      WHERE p.name ILIKE '%lemonade%'
    `);
    console.log("EXISTING RECIPES:");
    console.log(JSON.stringify(compositionRes.rows, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
checkNames();
