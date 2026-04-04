import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({});

async function runMigration() {
  try {
    const client = await pool.connect();
    
    // Convert image constraints from 500 max characters to unlimited TEXT limits 
    await client.query('ALTER TABLE combos ALTER COLUMN image TYPE TEXT');
    await client.query('ALTER TABLE products ALTER COLUMN image TYPE TEXT');
    
    console.log("Migration successful: Image columns are now TEXT type!");
    
    client.release();
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

runMigration();
