
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new Pool({ connectionString });

async function checkSchema() {
  try {
    console.log('--- Orders Table ---');
    const ordersCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
    console.table(ordersCols.rows);

    console.log('--- Order Items Table ---');
    const itemsCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_items'");
    console.table(itemsCols.rows);

    console.log('--- Products Table ---');
    const prodCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'");
    console.table(prodCols.rows);

    process.exit();
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();
