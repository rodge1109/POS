import pool from './server/config/database.js';

async function verifyIsolation() {
  const companyA = '00000000-0000-0000-0000-000000000000';
  const companyB = '11111111-1111-1111-1111-111111111111'; // Mock secondary company

  try {
    // Ensure company B exists
    await pool.query("INSERT INTO companies (id, name) VALUES ($1, 'Test Company B') ON CONFLICT DO NOTHING", [companyB]);

    console.log('--- Testing Barcode Isolation ---');
    const barcode = 'TEST-BARCODE-' + Date.now();

    // 1. Insert in Company A
    await pool.query(
      "INSERT INTO products (name, category, price, barcode, company_id) VALUES ($1, $2, $3, $4, $5)",
      ['Product A', 'Test', 10, barcode, companyA]
    );
    console.log(`Successfully added '${barcode}' for Company A`);

    // 2. Insert same barcode for Company B
    await pool.query(
      "INSERT INTO products (name, category, price, barcode, company_id) VALUES ($1, $2, $3, $4, $5)",
      ['Product B', 'Test', 20, barcode, companyB]
    );
    console.log(`Successfully added '${barcode}' for Company B (Isolated!)`);

    // 3. Cleanup
    await pool.query("DELETE FROM products WHERE barcode = $1", [barcode]);
    console.log('Cleanup successful.');

  } catch (err) {
    console.error('Verification failed:', err.message);
  } finally {
    process.exit(0);
  }
}

verifyIsolation();
