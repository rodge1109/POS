import express from 'express';
import { sendCustomReport } from '../services/emailReports.js';
import pool from '../config/database.js';

const router = express.Router();

/**
 * POST /api/reports/email
 * Send a specific report view to the configured owner email.
 */
router.post('/email', async (req, res) => {
  try {
    const { startDate, endDate, recipientEmail, reportType } = req.body;
    const company_id = req.company_id;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start and End dates are required.' });
    }

    await sendCustomReport(company_id, startDate, endDate, recipientEmail, reportType);
    
    res.json({ success: true, message: 'Report has been sent successfully.' });
  } catch (error) {
    console.error('Email report error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send report.' });
  }
});

/**
 * GET /api/reports/sales-items
 * Robust item-level sales source for Product Performance / Category Analysis.
 */
router.get('/sales-items', async (req, res) => {
  try {
    const { start, end } = req.query;
    const company_id = req.company_id;

    const params = [company_id];
    let where = `
      o.company_id::text = $1::text
      AND LOWER(COALESCE(o.order_status, '')) NOT IN ('voided', 'refunded', 'cancelled')
      AND LOWER(COALESCE(oi.status, '')) <> 'voided'
    `;

    if (start) {
      params.push(start);
      where += ` AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      where += ` AND (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date <= $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT
        COALESCE(oi.product_name, 'Unknown Item') AS name,
        COALESCE(p.category, 'Uncategorized') AS category,
        COALESCE(SUM(COALESCE(oi.quantity, 0)), 0)::float AS quantity,
        COALESCE(SUM(COALESCE(oi.subtotal, COALESCE(oi.unit_price, 0) * COALESCE(oi.quantity, 0))), 0)::float AS revenue,
        COALESCE(SUM(COALESCE(p.cost, 0) * COALESCE(oi.quantity, 0)), 0)::float AS cost
      FROM order_items oi
      JOIN orders o ON o.id::text = oi.order_id::text AND o.company_id::text = oi.company_id::text
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_sizes ps ON oi.product_id = ps.product_id AND oi.size_name = ps.size_name
      WHERE ${where}
      GROUP BY COALESCE(oi.product_name, 'Unknown Item'), COALESCE(p.category, 'Uncategorized')
      ORDER BY revenue DESC
      `,
      params
    );

    res.json({ success: true, items: result.rows });
  } catch (error) {
    console.error('Error fetching sales-items report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales-items report' });
  }
});

export default router;
