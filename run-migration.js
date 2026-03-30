import fs from 'fs';
import pool from './server/config/database.js';

async function runMigration() {
  try {
    const sql = fs.readFileSync('./server/migration_v3_add_product_cost.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:');
    console.error(err.message);
    if (err.position) {
      const sql = fs.readFileSync('./server/migration_multi_tenant.sql', 'utf8');
      const pos = parseInt(err.position, 10);
      console.error('Error near:');
      console.error(sql.substring(Math.max(0, pos - 50), Math.min(sql.length, pos + 50)));
    }
  } finally {
    process.exit(0);
  }
}

runMigration();
