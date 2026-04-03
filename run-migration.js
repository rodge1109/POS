import fs from 'fs';
import pool from './server/config/database.js';

async function runMigration() {
  try {
    const sql = fs.readFileSync('./server/supabase_init.sql', 'utf8');
    
    // Split by semicolon but ignore semicolons inside quotes or comments if possible
    // For simplicity with this specific file, we split by common SQL command boundaries
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Starting migration with ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await pool.query(statements[i]);
      } catch (stmtErr) {
        console.warn(`⚠ Warning on statement ${i + 1}: ${stmtErr.message}`);
        // Continue if it's an "already exists" or similar non-critical error
        if (!stmtErr.message.includes('already exists') && !stmtErr.message.includes('duplicate')) {
           throw stmtErr;
        }
      }
    }
    
    console.log('✓ Local Database migration successful!');
  } catch (err) {
    console.error('✗ Migration failed:');
    console.error(err.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
