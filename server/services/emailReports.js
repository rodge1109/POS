import nodemailer from 'nodemailer';
import pool from '../config/database.js';

// Load settings from DB scoped by company_id
async function getSettings(company_id) {
  const result = await pool.query('SELECT key, value FROM system_settings WHERE company_id = $1', [company_id]);
  const s = {};
  result.rows.forEach(r => { s[r.key] = r.value; });
  return s;
}

const currencySymbols = {
  PHP: '₱', USD: '$', EUR: '€', GBP: '£', SGD: 'S$', AUD: 'A$', CAD: 'C$', JPY: '¥'
};

const formatCurrency = (amount, currency = 'PHP') => {
  const value = parseFloat(amount || 0);
  const symbol = currencySymbols[currency] || `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
};

// Create transporter from saved SMTP settings
async function createTransporter(s) {
  if (!s.smtp_host || !s.smtp_user || !s.smtp_pass) {
    throw new Error('SMTP not configured. Please set SMTP Host, User, and Password in System Config.');
  }
  return nodemailer.createTransport({
    host: s.smtp_host,
    port: parseInt(s.smtp_port) || 587,
    secure: parseInt(s.smtp_port) === 465,
    auth: { user: s.smtp_user, pass: s.smtp_pass },
  });
}

// ── Report Queries ─────────────────────────────────────────────────────────

async function getSalesReport(startDate, endDate, company_id) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(subtotal), 0) as total_subtotal,
      COALESCE(SUM(tax_amount), 0) as total_tax,
      COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_orders,
      COUNT(CASE WHEN payment_method = 'gcash' THEN 1 END) as gcash_orders,
      COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_orders,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'gcash' THEN total_amount ELSE 0 END), 0) as gcash_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_revenue
    FROM orders
    WHERE order_status IN ('completed', 'received', 'preparing')
      AND company_id = $3
      AND DATE(created_at AT TIME ZONE 'Asia/Manila') BETWEEN $1 AND $2
  `, [startDate, endDate, company_id]);

  const topItems = await pool.query(`
    SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.subtotal) as total_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_status IN ('completed', 'received', 'preparing')
      AND o.company_id = $3
      AND DATE(o.created_at AT TIME ZONE 'Asia/Manila') BETWEEN $1 AND $2
      AND oi.status = 'active'
    GROUP BY oi.product_name
    ORDER BY total_qty DESC
    LIMIT 10
  `, [startDate, endDate, company_id]);

  return { summary: result.rows[0], topItems: topItems.rows };
}

// ── HTML Email Builder ─────────────────────────────────────────────────────

function buildEmailHtml(title, period, businessName, salesData, currency = 'PHP') {
  const { summary, topItems } = salesData;
  const fmt = (n) => formatCurrency(n, currency);

  const topItemsRows = topItems.map(item => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${item.product_name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.total_qty}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(item.total_sales)}</td>
    </tr>`).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0891b2;color:#fff;padding:24px 32px;">
      <h1 style="margin:0;font-size:22px;">${businessName}</h1>
      <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">${title}</p>
      <p style="margin:4px 0 0;opacity:0.7;font-size:13px;">${period}</p>
    </div>
    <div style="padding:24px 32px;">
      <h3 style="color:#0e7490;margin-top:0;">Sales Summary</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#ecfeff;">
          <td style="padding:10px 14px;font-weight:bold;border-radius:8px 0 0 8px;">Total Orders</td>
          <td style="padding:10px 14px;text-align:right;font-size:20px;font-weight:bold;color:#0891b2;border-radius:0 8px 8px 0;">${summary.total_orders}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Total Sales</td>
          <td style="padding:10px 14px;text-align:right;font-size:20px;font-weight:bold;color:#0891b2;">${fmt(summary.total_revenue)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 14px;color:#6b7280;">Subtotal</td>
          <td style="padding:8px 14px;text-align:right;color:#374151;">${fmt(summary.total_subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:8px 14px;color:#6b7280;">Tax Collected</td>
          <td style="padding:8px 14px;text-align:right;color:#374151;">${fmt(summary.total_tax)}</td>
        </tr>
      </table>

      <h3 style="color:#0e7490;margin-top:24px;">By Payment Method</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#ecfeff;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #a5f3fc;">Method</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #a5f3fc;">Orders</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #a5f3fc;">Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:6px 12px;">Cash</td><td style="text-align:center;">${summary.cash_orders}</td><td style="text-align:right;">${fmt(summary.cash_revenue)}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:6px 12px;">GCash</td><td style="text-align:center;">${summary.gcash_orders}</td><td style="text-align:right;">${fmt(summary.gcash_revenue)}</td></tr>
          <tr><td style="padding:6px 12px;">Card</td><td style="text-align:center;">${summary.card_orders}</td><td style="text-align:right;">${fmt(summary.card_revenue)}</td></tr>
        </tbody>
      </table>

      ${topItems.length > 0 ? `
      <h3 style="color:#0e7490;margin-top:24px;">Top Selling Items</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#ecfeff;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #a5f3fc;">Item</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #a5f3fc;">Qty Sold</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #a5f3fc;">Sales</th>
          </tr>
        </thead>
        <tbody>${topItemsRows}</tbody>
      </table>` : ''}
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">
      This is an automated report from ${businessName} POS System
    </div>
  </div>
</body>
</html>`;
}

// ── Send Functions ─────────────────────────────────────────────────────────

export async function sendCustomReport(company_id, startDate, endDate, recipientEmail) {
  const s = await getSettings(company_id);
  const emailTo = recipientEmail || s.owner_email;
  if (!emailTo) throw new Error('No recipient email configured.');

  const salesData = await getSalesReport(startDate, endDate, company_id);

  const html = buildEmailHtml(
    'Requested Sales Report',
    `Period: ${startDate} to ${endDate}`,
    s.business_name || 'Restaurant',
    salesData,
    s.currency || 'PHP'
  );

  const transporter = await createTransporter(s);
  await transporter.sendMail({
    from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
    to: emailTo,
    subject: `Sales Report — ${startDate} to ${endDate} | ${s.business_name || 'Restaurant'}`,
    html,
  });
}

// Fixed Daily/Weekly/Monthly to support company_id or run for all companies
export async function sendDailyReport(company_id) {
  if (company_id) {
    const s = await getSettings(company_id);
    if (s.report_daily !== 'true' || !s.owner_email) return;

    const today = new Date();
    const ph = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const dateStr = `${ph.getFullYear()}-${String(ph.getMonth() + 1).padStart(2, '0')}-${String(ph.getDate()).padStart(2, '0')}`;

    return sendCustomReport(company_id, dateStr, dateStr, s.owner_email);
  } else {
    // Run for ALL companies
    const res = await pool.query('SELECT id FROM companies');
    for (const row of res.rows) {
      try { await sendDailyReport(row.id); } catch(e) {}
    }
  }
}

export async function sendWeeklyReport(company_id) {
  if (company_id) {
    const s = await getSettings(company_id);
    if (s.report_weekly !== 'true' || !s.owner_email) return;

    const ph = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const endDate = `${ph.getFullYear()}-${String(ph.getMonth() + 1).padStart(2, '0')}-${String(ph.getDate()).padStart(2, '0')}`;
    const start = new Date(ph);
    start.setDate(start.getDate() - 6);
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

    const salesData = await getSalesReport(startDate, endDate, company_id);

    const html = buildEmailHtml(
      'Weekly Sales Report',
      `Period: ${startDate} to ${endDate}`,
      s.business_name || 'Restaurant',
      salesData,
      s.currency || 'PHP'
    );

    const transporter = await createTransporter(s);
    return transporter.sendMail({
      from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
      to: s.owner_email,
      subject: `Weekly Report — ${startDate} to ${endDate} | ${s.business_name || 'Restaurant'}`,
      html,
    });
  } else {
    const res = await pool.query('SELECT id FROM companies');
    for (const row of res.rows) {
      try { await sendWeeklyReport(row.id); } catch(e) {}
    }
  }
}

export async function sendMonthlyReport(company_id) {
  if (company_id) {
    const s = await getSettings(company_id);
    if (s.report_monthly !== 'true' || !s.owner_email) return;

    const ph = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const year = ph.getFullYear();
    const month = ph.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(ph.getDate()).padStart(2, '0')}`;
    const monthName = ph.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' });

    const salesData = await getSalesReport(startDate, endDate, company_id);

    const html = buildEmailHtml(
      'Monthly Sales Report',
      `Month: ${monthName}`,
      s.business_name || 'Restaurant',
      salesData,
      s.currency || 'PHP'
    );

    const transporter = await createTransporter(s);
    return transporter.sendMail({
      from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
      to: s.owner_email,
      subject: `Monthly Report — ${monthName} | ${s.business_name || 'Restaurant'}`,
      html,
    });
  } else {
    const res = await pool.query('SELECT id FROM companies');
    for (const row of res.rows) {
      try { await sendMonthlyReport(row.id); } catch(e) {}
    }
  }
}

export async function sendTestEmail(company_id) {
  const s = await getSettings(company_id);
  if (!s.owner_email) throw new Error('Owner email not configured.');

  const transporter = await createTransporter(s);
  return transporter.sendMail({
    from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
    to: s.owner_email,
    subject: `Test Email — ${s.business_name || 'Restaurant'} POS`,
    text: 'Your email configuration is working correctly.',
  });
}
