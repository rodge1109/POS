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

async function addInventoryTables() {
  try {
    console.log('Creating inventory tables...');
    
    // Create ingredients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        unit VARCHAR(50) NOT NULL,
        current_stock DECIMAL(12,2) DEFAULT 0,
        reorder_level DECIMAL(12,2) DEFAULT 0,
        supplier VARCHAR(255),
        cost_per_unit DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Ingredients table created');

    // Create product_composition table (recipes - bill of materials)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_composition (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        quantity_required DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, ingredient_id)
      );
    `);
    console.log('✓ Product composition (recipes) table created');

    // Create inventory_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        quantity_change DECIMAL(12,2) NOT NULL,
        quantity_after DECIMAL(12,2) NOT NULL,
        notes TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Inventory transactions table created');

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
    `);
    console.log('✓ Ingredients name index created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_product_composition_product_id ON product_composition(product_id);
    `);
    console.log('✓ Product composition product_id index created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_id ON inventory_transactions(ingredient_id);
    `);
    console.log('✓ Inventory transactions ingredient_id index created');

    console.log('\n✓ All inventory tables created successfully!');
    await pool.end();
  } catch (error) {
    console.error('✗ Error creating tables:', error.message);
    process.exit(1);
  }
}

addInventoryTables();
