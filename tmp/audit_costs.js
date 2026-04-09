import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkProductCosts() {
    try {
        const res = await pool.query(`
            SELECT p.name, p.cost, p.price, p.category,
                   (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
            FROM products p
            ORDER BY sales_count DESC, p.name ASC
            LIMIT 20
        `);
        
        let output = 'NAME,COST,PRICE,MARGIN,SALES\n';
        res.rows.forEach(row => {
            const cost = parseFloat(row.cost || 0);
            const price = parseFloat(row.price || 0);
            const margin = price - cost;
            const marginPct = price > 0 ? ((margin / price) * 100).toFixed(1) + '%' : '0%';
            output += `${row.name},${cost},${price},${marginPct},${row.sales_count}\n`;
        });
        
        fs.writeFileSync(path.resolve(__dirname, 'audit_report.csv'), output, 'utf8');
        console.log('Report generated: tmp/audit_report.csv');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkProductCosts();
