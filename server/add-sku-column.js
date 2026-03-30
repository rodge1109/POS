import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function addSkuColumn() {
  try {
    console.log('Adding SKU column to products table...');
    
    // Add column if it doesn't exist
    const query = `
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
    `;
    
    await pool.query(query);
    console.log('✓ SKU column added successfully');
    
    // Also add a unique index on SKU to prevent duplicates
    const indexQuery = `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
    `;
    
    await pool.query(indexQuery);
    console.log('✓ SKU index created successfully');
    
    await pool.end();
  } catch (error) {
    console.error('✗ Error adding SKU column:', error.message);
    process.exit(1);
  }
}

addSkuColumn();
