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

async function test() {
  try {
    console.log('Testing products query...');
    const company_id = '562b9f65-608f-455f-8340-ba9a2811b936'; // From .env
    const query = `
      SELECT p.*, 
             (SELECT COUNT(*) FROM product_composition pc WHERE pc.product_id = p.id AND pc.company_id = p.company_id) as ingredient_count,
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
                WHERE ps.product_id = p.id AND ps.company_id = p.company_id),
               '[]'::json
             ) as sizes_json
      FROM products p
      WHERE p.company_id::text = $1
      ORDER BY p.category, p.name
    `;
    const result = await pool.query(query, [company_id]);
    console.log('Success! Count:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('First row sizes_json type:', typeof result.rows[0].sizes_json);
      console.log('First row sizes_json:', result.rows[0].sizes_json);
    }

    console.log('Testing tables query...');
    const tableQuery = `
      SELECT t.*,
        o.order_number, o.total_amount as order_total,
        o.created_at as order_opened_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id::text = t.current_order_id::text AND company_id::text = t.company_id::text) as item_count
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id::text = o.id::text AND t.company_id::text = o.company_id::text
      WHERE t.company_id::text = COALESCE($1, 'invalid')::text OR t.company_id::text = 'd6797595-412e-4b3b-8378-4442a397d207'
      ORDER BY 
        CASE 
          WHEN t.table_number::text ~ '^[0-9]+$' THEN t.table_number::text::int 
          ELSE 999999 
        END, 
        t.table_number
    `;
    const tableResult = await pool.query(tableQuery, [company_id]);
    console.log('Success! Tables count:', tableResult.rows.length);
  } catch (err) {
    console.error('FAILED:', err.message);
    if (err.hint) console.error('HINT:', err.hint);
  } finally {
    await pool.end();
  }
}

test();
