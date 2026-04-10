import pool from '../server/config/database.js';

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_modifiers (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      modifier_id INTEGER NOT NULL,
      company_id UUID,
      UNIQUE(product_id, modifier_id, company_id)
    )
  `);
  console.log('✅ product_modifiers table created (or already existed)');

  // Verify
  const r = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'product_modifiers' ORDER BY ordinal_position
  `);
  console.log('Columns:', r.rows.map(r => r.column_name).join(', '));
} catch(e) {
  console.error('Error:', e.message);
}
process.exit(0);
