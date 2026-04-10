import pool from '../server/config/database.js';

try {
  const r = await pool.query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'product_sizes' 
     ORDER BY ordinal_position`
  );
  console.log('product_sizes columns:');
  r.rows.forEach(row => console.log(`  ${row.column_name} | ${row.data_type} | nullable: ${row.is_nullable}`));

  // Also test a direct PUT-style query to see what fails
  const r2 = await pool.query(
    `SELECT id FROM products WHERE company_id = '562b9f65-608f-455f-8340-ba9a2811b936' LIMIT 3`
  );
  console.log('\nSample product IDs:', r2.rows.map(r => r.id));

} catch(e) {
  console.error('Error:', e.message);
}
process.exit(0);
