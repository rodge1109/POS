/**
 * Add Inventory Management Tables
 * This script creates tables for ingredients, product composition (recipes), and inventory tracking
 * Run this once to set up the inventory management system
 */

import pool from './config/database.js';

const addInventoryTables = async () => {
  const client = await pool.connect();
  try {
    console.log('Adding inventory management tables...');

    // Create ingredients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        unit VARCHAR(50) NOT NULL, -- 'kg', 'liters', 'pieces', 'grams', etc.
        current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
        reorder_level DECIMAL(10,3) DEFAULT 0, -- Alert when stock falls below this
        supplier VARCHAR(255),
        supplier_contact VARCHAR(100),
        cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created ingredients table');

    // Create product_composition table (Bill of Materials / Recipes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_composition (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE RESTRICT,
        quantity_required DECIMAL(10,3) NOT NULL, -- Amount of ingredient needed per product
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, ingredient_id)
      );
    `);
    console.log('✓ Created product_composition table');

    // Create inventory_transactions table (audit trail)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL, -- 'order_deduction', 'purchase', 'adjustment', 'waste'
        quantity_change DECIMAL(10,3) NOT NULL, -- Can be negative for deductions
        quantity_after DECIMAL(10,3) NOT NULL,
        reference_id INTEGER, -- order_id for deductions
        reference_type VARCHAR(50), -- 'order' for deductions
        notes TEXT,
        created_by VARCHAR(100), -- employee name or 'system'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created inventory_transactions table');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
      CREATE INDEX IF NOT EXISTS idx_product_composition_product_id ON product_composition(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_composition_ingredient_id ON product_composition(ingredient_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_id ON inventory_transactions(ingredient_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference_id ON inventory_transactions(reference_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);
    `);
    console.log('✓ Created indexes');

    // Insert some sample ingredients
    await client.query(`
      INSERT INTO ingredients (name, unit, current_stock, reorder_level, cost_per_unit) VALUES
      ('Burger Bun', 'pieces', 100, 20, 5.00),
      ('Beef Patty', 'pieces', 80, 15, 15.00),
      ('Cheese', 'kg', 5.0, 1.0, 200.00),
      ('Lettuce', 'kg', 3.5, 0.5, 60.00),
      ('Tomato', 'kg', 4.0, 1.0, 50.00),
      ('Onion', 'kg', 6.0, 1.5, 30.00),
      ('Rice', 'kg', 20.0, 5.0, 40.00),
      ('Chicken Breast', 'kg', 10.0, 2.0, 250.00),
      ('Cooking Oil', 'liters', 15.0, 3.0, 100.00),
      ('Salt', 'kg', 5.0, 1.0, 15.00)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✓ Inserted sample ingredients');

    console.log('✅ Inventory management tables created successfully!');
  } catch (error) {
    if (error.code === '42P07') {
      console.log('✓ Tables already exist');
    } else {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  } finally {
    client.release();
  }
};

addInventoryTables().then(() => {
  console.log('Setup complete. You can now use inventory management features.');
  process.exit(0);
}).catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
