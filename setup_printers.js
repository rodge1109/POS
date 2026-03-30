import pool from './server/config/database.js';

async function setup() {
  try {
    const res = await pool.query("SELECT id FROM companies WHERE name = 'KEANU LUGAWAN'");
    if (res.rows.length === 0) {
      console.log('Company not found');
      return;
    }
    const cid = res.rows[0].id;
    const settings = [
      ['printer_auto_receipt', 'true'],
      ['printer_auto_kitchen', 'true'],
      ['printer_width', '58mm'],
      ['printer_header', '--- KUCHEFNERO POS ---'],
      ['printer_footer', 'Thank you! Please come again.'],
      ['printer_kitchen_mode', 'true'], // Enable separate kitchen slip logic
      ['printer_manual_tear', 'true']
    ];

    for (const [key, value] of settings) {
      await pool.query(
        'INSERT INTO system_settings (key, value, company_id) VALUES ($1, $2, $3) ON CONFLICT (key, company_id) DO UPDATE SET value = $2',
        [key, value, cid]
      );
    }
    console.log('Printer settings initialized successfully for KEANU LUGAWAN');
  } catch (err) {
    console.error('Setup failed:', err);
  } finally {
    await pool.end();
  }
}

setup();
