import pool from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'fix_image_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration: Increasing image column size to TEXT...');
    await pool.query(sql);
    console.log('Success! Image columns for products and combos are now TEXT.');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
