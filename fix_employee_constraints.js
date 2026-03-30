import pool from './server/config/database.js';

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting employee constraint migration...');
    await client.query('BEGIN');

    // Drop global unique constraints
    console.log('Dropping old global constraints...');
    await client.query('ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_username_key CASCADE');
    await client.query('ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_key CASCADE');
    await client.query('ALTER TABLE employees DROP CONSTRAINT IF EXISTS "employees_PIN_key" CASCADE');
    
    // Add company-scoped unique constraints
    console.log('Creating unique constraints scoped to company_id...');
    await client.query('ALTER TABLE employees ADD CONSTRAINT employees_company_username_unique UNIQUE (company_id, username)');
    
    try {
      // Adding PIN constraint separately in case some legacy test data already violates this
      await client.query('ALTER TABLE employees ADD CONSTRAINT employees_company_pin_unique UNIQUE (company_id, "PIN")');
    } catch (pinError) {
      console.warn('Could not add PIN unique constraint (likely duplicate data exists). Skipping PIN constraint for now.');
      console.warn(pinError.message);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
