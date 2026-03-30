import express from 'express';
import pool from '../config/database.js';
import { sendTestEmail } from '../services/emailReports.js';
import { seedDemoData } from '../services/demoSeeder.js';

const router = express.Router();

// GET all settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM system_settings WHERE company_id = $1 ORDER BY key', [req.company_id]);
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (e) {
    console.error('Error fetching settings:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT update settings
router.put('/', async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid settings payload' });
  }
  try {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO system_settings (key, value, updated_at, company_id)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (company_id, key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value ?? '', req.company_id]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Error saving settings:', e);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
});

// POST send test email
router.post('/test-email', async (req, res) => {
  try {
    await sendTestEmail();
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (e) {
    console.error('Test email error:', e);
    res.status(500).json({ success: false, error: e.message || 'Failed to send test email' });
  }
});

// POST seed demo data
router.post('/seed', async (req, res) => {
  try {
    const company_id = req.company_id;
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'No company context found' });
    }
    await seedDemoData(company_id);
    res.json({ success: true, message: 'Demo data loaded successfully' });
  } catch (e) {
    console.error('Seed demo data error:', e);
    res.status(500).json({ success: false, error: e.message || 'Failed to seed demo data' });
  }
});

// DELETE purge all restaurant data (Practice Mode)
router.delete('/purge-data', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const company_id = req.company_id;

    // Ordered deletions to handle foreign key constraints if they are not ON DELETE CASCADE
    // 1. Transactional Data
    await client.query('DELETE FROM order_item_adjustments WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM order_payments WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM order_items WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM orders WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM inventory_transactions WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM shifts WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM customer_ledger WHERE company_id = $1', [company_id]);

    // 2. Master Data (Menu & Tables)
    await client.query('DELETE FROM combo_items WHERE combo_id IN (SELECT id FROM combos WHERE company_id = $1)', [company_id]);
    await client.query('DELETE FROM combos WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM product_composition WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM product_sizes WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM products WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM tables WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM customers WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM ingredients WHERE company_id = $1', [company_id]);
    await client.query('DELETE FROM modifiers WHERE company_id = $1', [company_id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'All restaurant data has been purged successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purging restaurant data:', error);
    res.status(500).json({ success: false, error: 'Failed to purge restaurant data.' });
  } finally {
    client.release();
  }
});

export default router;
