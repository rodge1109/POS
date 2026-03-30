import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedDemoData(company_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Tables (T1 - T10)
    for (let i = 1; i <= 10; i++) {
      await client.query(
        `INSERT INTO tables (table_number, capacity, section, company_id) 
         VALUES ($1, 4, 'Main', $2) 
         ON CONFLICT (company_id, table_number) DO NOTHING`,
        [`T${i}`, company_id]
      );
    }

    // 2. Seed Common Modifiers
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

    // 3. Parse and Seed Products from CSV
    const csvPath = path.resolve(__dirname, '../../SAMPLE_PRODUCTS.csv');
    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf8');
      const lines = csvData.split(/\r?\n/);
      // Skip header (id,name,category,price,image,description,popular)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Naive CSV split since our sample data doesn't have commas in quoted fields
        const cols = line.split(',');
        if (cols.length >= 7) {
          const name = cols[1];
          const category = cols[2];
          const price = parseFloat(cols[3]) || 0;
          const image = cols[4];
          const description = cols[5];
          const popular = cols[6].toUpperCase() === 'TRUE';

          await client.query(
            `INSERT INTO products (name, category, price, description, image, popular, company_id, stock_quantity, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 100, true)
             ON CONFLICT (company_id, name) DO NOTHING`,
            [name, category, price || 0, description, image, popular, company_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding demo data:', error);
    throw error;
  } finally {
    client.release();
  }
}
