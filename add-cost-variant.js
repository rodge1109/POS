import pool from './server/config/database.js';

async function addCostColumn() {
  try {
    console.log('Adding cost column to product_sizes...');
    await pool.query('ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) DEFAULT 0');
    console.log('✓ Successfully added cost column to product_sizes');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

addCostColumn();
