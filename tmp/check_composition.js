import pool from '../server/config/database.js';

const r = await pool.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'product_composition' 
  ORDER BY ordinal_position
`);
console.log('product_composition columns:');
r.rows.forEach(c => console.log(' ', c.column_name, '|', c.data_type));

// Sample a few rows
const s = await pool.query(`SELECT * FROM product_composition LIMIT 3`);
console.log('\nSample rows:', JSON.stringify(s.rows, null, 2));

process.exit(0);
