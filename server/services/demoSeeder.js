import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedDemoData(company_id) {
  const client = await pool.connect();
  try {
    console.log(`[Seeder] Finalized ID to use: ${company_id}`);
    await client.query('BEGIN');
    
    // 1. Force ensure the company exists (UPSERT)
    await client.query(
      `INSERT INTO companies (id, name, login_pin, status) 
       VALUES ($1, 'Demo Restaurant', '1109', 'active') 
       ON CONFLICT (id) DO UPDATE SET name = 'Demo Restaurant' WHERE companies.id = $1`,
      [company_id]
    );

    // 1. Seed Tables (T1 - T10)
    console.log('[Seeder] Step 1: Seeding tables...');
    for (let i = 1; i <= 10; i++) {
      await client.query(
        `INSERT INTO tables (table_number, capacity, section, company_id) 
         VALUES ($1, 4, 'Main', $2) 
         ON CONFLICT (company_id, table_number) DO NOTHING`,
        [`T${i}`, company_id]
      );
    }
    console.log('[Seeder] Step 1 complete.');

    // 2. Seed Common Modifiers
    console.log('[Seeder] Step 2: Seeding modifiers...');
    const modifiers = [
      { name: 'Extra Cheese', type: 'addon', price: 2.00 },
      { name: 'Bacon', type: 'addon', price: 3.00 },
      { name: 'No Onions', type: 'option', price: 0.00 }
    ];
    for (const mod of modifiers) {
      await client.query(
        `INSERT INTO modifiers (name, type, price, company_id) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (company_id, name) DO NOTHING`,
        [mod.name, mod.type, mod.price, company_id]
      );
    }
    console.log('[Seeder] Step 2 complete.');

    // 3. Parse and Seed Products from CSV
    const csvPath = path.resolve(__dirname, '../../SAMPLE_PRODUCTS.csv');
    console.log(`[Seeder] Step 3: Checking CSV at ${csvPath}`);
    if (fs.existsSync(csvPath)) {
      console.log('[Seeder] CSV file found. Parsing lines...');
      const csvData = fs.readFileSync(csvPath, 'utf8');
      const lines = csvData.split(/\r?\n/);
      console.log(`[Seeder] CSV has ${lines.length} lines.`);
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',');
        if (cols.length >= 7) {
          const name = cols[1];
          const category = cols[2];
          const price = parseFloat(cols[3]) || 0;
          const image = cols[4];
          const description = cols[5];
          const popular = cols[6] && cols[6].toUpperCase() === 'TRUE';

          await client.query(
            `INSERT INTO products (name, category, price, description, image, popular, company_id, stock_quantity, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 100, true)
             ON CONFLICT (company_id, name) DO NOTHING`,
            [name, category, price || 0, description, image, popular, company_id]
          );
        }
      }
      console.log('[Seeder] Step 3 complete.');
    } else {
      console.warn(`[Seeder] CSV file NOT FOUND at: ${csvPath}`);
    }

    await client.query('COMMIT');
    console.log('[Seeder] Seed process finished successfully.');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Seeder] Seed process CRASHED:', error);
    throw error;
  } finally {
    client.release();
  }
}
