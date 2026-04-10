import pool from '../server/config/database.js';

try {
  // Add cost column to product_sizes if it doesn't exist
  await pool.query(`
    ALTER TABLE product_sizes 
    ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0
  `);
  console.log('✅ cost column added to product_sizes (or already existed)');

  // Verify
  const r = await pool.query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns 
     WHERE table_name = 'product_sizes' 
     ORDER BY ordinal_position`
  );
  console.log('\nUpdated product_sizes schema:');
  r.rows.forEach(row => 
    console.log(`  ${row.column_name} | ${row.data_type} | nullable: ${row.is_nullable} | default: ${row.column_default}`)
  );
} catch(e) {
  console.error('Error:', e.message);
}
process.exit(0);
