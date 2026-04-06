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

export default router;
