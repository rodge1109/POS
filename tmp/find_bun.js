import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function findBurgerBun() {
  try {
    const cidFromSubagent = 'e663b56a-862f-468c-936f-6c7004cd8483';
    console.log(`Checking for Burger Bun for company: ${cidFromSubagent}`);
    
    // Check all records first
    const allIngredients = await pool.query('SELECT * FROM ingredients');
    console.log(`--- ALL INGREDIENTS (${allIngredients.rows.length}) ---`);
    allIngredients.rows.forEach(ing => {
      console.log(`ID: ${ing.id}, Name: "${ing.name}", CID: ${ing.company_id}`);
    });

    const burgerBun = await pool.query(
      "SELECT * FROM ingredients WHERE LOWER(name) = 'burger bun' AND company_id = $1",
      [cidFromSubagent]
    );
    
    if (burgerBun.rows.length > 0) {
      console.log('--- BURGER BUN FOUND ---');
      console.log(JSON.stringify(burgerBun.rows, null, 2));
    } else {
      console.log('--- NO BURGER BUN FOUND FOR THIS COMPANY ---');
    }
    
    // Check if there is ANY burger bun for ANY company
    const anyBurgerBun = await pool.query(
      "SELECT * FROM ingredients WHERE LOWER(name) = 'burger bun'"
    );
    console.log('--- ANY BURGER BUN IN DB ---');
    console.log(JSON.stringify(anyBurgerBun.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

findBurgerBun();
