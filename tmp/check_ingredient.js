import pool from './server/config/database.js';

async function checkIngredient() {
  try {
    const nameToCheck = 'burger bun';
    const result = await pool.query(
      "SELECT * FROM ingredients WHERE LOWER(name) = $1",
      [nameToCheck]
    );
    console.log('--- FOUND INGREDIENTS ---');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log('--- END ---');
  } catch (error) {
    console.error('Error checking ingredient:', error);
  } finally {
    await pool.end();
  }
}

checkIngredient();
