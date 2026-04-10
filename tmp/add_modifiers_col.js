import pool from '../server/config/database.js';

try {
  await pool.query(`
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]'::jsonb
  `);
  console.log('✅ modifiers column added to order_items');

  // Verify
  const r = await pool.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'modifiers'
  `);
  console.log('Column:', JSON.stringify(r.rows[0]));
} catch(e) {
  console.error('Error:', e.message);
}
process.exit(0);
