import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const { Pool } = pg;
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getProductDetails(productId) {
  try {
    const query = `
      SELECT p.*, 
             COALESCE(
               (SELECT json_agg(
                   json_build_object(
                     'id', ps.id, 
                     'name', ps.size_name, 
                     'price', ps.price, 
                     'cost', ps.cost
                   ) ORDER BY ps.price
                 )
                FROM product_sizes ps 
                WHERE ps.product_id = p.id),
               '[]'::json
             ) as sizes
      FROM products p
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [productId]);
    
    if (result.rows.length === 0) {
      console.log(`No product found with ID: ${productId}`);
    } else {
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

// Pass a product ID as a command line argument, or use 18546 as default
const targetId = process.argv[2] ? parseInt(process.argv[2], 10) : 18546;
getProductDetails(targetId);
