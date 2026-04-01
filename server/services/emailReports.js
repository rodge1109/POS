import nodemailer from 'nodemailer';
import pool from '../config/database.js';

// Load settings from DB
async function getSettings() {
  const result = await pool.query('SELECT key, value FROM system_settings');
  const s = {};
  result.rows.forEach(r => { s[r.key] = r.value; });
  return s;
}

const currencySymbols = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥'
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

async function getSalesReport(startDate, endDate) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(subtotal), 0) as total_subtotal,
      COALESCE(SUM(tax_amount), 0) as total_tax,
      COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_orders,
      COUNT(CASE WHEN payment_method = 'gcash' THEN 1 END) as gcash_orders,
      COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_orders,
      COUNT(CASE WHEN payment_method = 'credit' THEN 1 END) as credit_orders,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'gcash' THEN total_amount ELSE 0 END), 0) as gcash_revenue,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_revenue
    FROM orders
    WHERE order_status IN ('completed', 'received', 'preparing')
      AND DATE(created_at AT TIME ZONE 'Asia/Manila') BETWEEN $1 AND $2
  `, [startDate, endDate]);

  const topItems = await pool.query(`
    SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.subtotal) as total_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_status IN ('completed', 'received', 'preparing')
      AND DATE(o.created_at AT TIME ZONE 'Asia/Manila') BETWEEN $1 AND $2
      AND oi.status = 'active'
    GROUP BY oi.product_name
    ORDER BY total_qty DESC
    LIMIT 10
  `, [startDate, endDate]);

  return { summary: result.rows[0], topItems: topItems.rows };
}

async function getKitchenReport(startDate, endDate) {
  const result = await pool.query(`
    SELECT o.order_number, o.order_status, o.created_at,
           t.table_number, o.service_type
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.order_status IN ('received', 'preparing', 'completed', 'paid')
      AND EXISTS (
        SELECT 1 FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND (COALESCE(p.send_to_kitchen, true) = true OR p.id IS NULL)
      )
      AND DATE(o.created_at AT TIME ZONE 'Asia/Manila') BETWEEN $1 AND $2
    ORDER BY o.created_at DESC
  `, [startDate, endDate]);
  return result.rows;
}

// ── HTML Email Builder ─────────────────────────────────────────────────────

function buildEmailHtml(title, period, businessName, salesData, kitchenOrders = null, currency = 'PHP') {
  const { summary, topItems } = salesData;
  const fmt = (n) => formatCurrency(n, currency);

  const topItemsRows = topItems.map(item => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${item.product_name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.total_qty}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(item.total_sales)}</td>
    </tr>`).join('');

  const kitchenSection = kitchenOrders ? `
    <h3 style="color:#166534;margin-top:32px;">Kitchen Orders (${kitchenOrders.length})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#f0fdf4;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #bbf7d0;">Order #</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #bbf7d0;">Table/Type</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #bbf7d0;">Status</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #bbf7d0;">Time</th>
        </tr>
      </thead>
      <tbody>
        ${kitchenOrders.map(o => `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-family:monospace;">${o.order_number}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${o.table_number ? `Table ${o.table_number}` : o.service_type || 'POS'}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${o.order_status}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${new Date(o.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#16a34a;color:#fff;padding:24px 32px;">
      <h1 style="margin:0;font-size:22px;">${businessName}</h1>
      <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">${title}</p>
      <p style="margin:4px 0 0;opacity:0.7;font-size:13px;">${period}</p>
    </div>
    <div style="padding:24px 32px;">
      <h3 style="color:#166534;margin-top:0;">Sales Summary</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 14px;font-weight:bold;border-radius:8px 0 0 8px;">Total Orders</td>
          <td style="padding:10px 14px;text-align:right;font-size:20px;font-weight:bold;color:#16a34a;border-radius:0 8px 8px 0;">${summary.total_orders}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;">Total Sales</td>
          <td style="padding:10px 14px;text-align:right;font-size:20px;font-weight:bold;color:#16a34a;">${fmt(summary.total_revenue)}</td>
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

      <h3 style="color:#166534;margin-top:24px;">By Payment Method</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f0fdf4;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #bbf7d0;">Method</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #bbf7d0;">Orders</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #bbf7d0;">Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:6px 12px;">Cash</td><td style="text-align:center;">${summary.cash_orders}</td><td style="text-align:right;">${fmt(summary.cash_revenue)}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:6px 12px;">GCash</td><td style="text-align:center;">${summary.gcash_orders}</td><td style="text-align:right;">${fmt(summary.gcash_revenue)}</td></tr>
          <tr><td style="padding:6px 12px;">Card</td><td style="text-align:center;">${summary.card_orders}</td><td style="text-align:right;">${fmt(summary.card_revenue)}</td></tr>
        </tbody>
      </table>

      ${topItems.length > 0 ? `
      <h3 style="color:#166534;margin-top:24px;">Top Selling Items</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f0fdf4;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #bbf7d0;">Item</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #bbf7d0;">Qty Sold</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #bbf7d0;">Sales</th>
          </tr>
        </thead>
        <tbody>${topItemsRows}</tbody>
      </table>` : ''}

      ${kitchenSection}
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">
      This is an automated report from ${businessName} POS System
    </div>
  </div>
</body>
</html>`;
}

// ── Send Functions ─────────────────────────────────────────────────────────

export async function sendDailyReport() {
  const s = await getSettings();
  if (s.report_daily !== 'true' || !s.owner_email) return;

  const today = new Date();
  const ph = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const dateStr = `${ph.getFullYear()}-${String(ph.getMonth() + 1).padStart(2, '0')}-${String(ph.getDate()).padStart(2, '0')}`;

  const salesData = await getSalesReport(dateStr, dateStr);
  const kitchenOrders = s.report_kitchen === 'true' ? await getKitchenReport(dateStr, dateStr) : null;

  const html = buildEmailHtml(
    'Daily Sales Report',
    `Date: ${dateStr}`,
    s.business_name || 'Restaurant',
    salesData,
    kitchenOrders,
    s.currency || 'PHP'
  );

  const transporter = await createTransporter(s);
  await transporter.sendMail({
    from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
    to: s.owner_email,
    subject: `Daily Report — ${dateStr} | ${s.business_name || 'Restaurant'}`,
    html,
  });
  console.log(`Daily report sent to ${s.owner_email}`);
}

export async function sendWeeklyReport() {
  const s = await getSettings();
  if (s.report_weekly !== 'true' || !s.owner_email) return;

  const ph = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const endDate = `${ph.getFullYear()}-${String(ph.getMonth() + 1).padStart(2, '0')}-${String(ph.getDate()).padStart(2, '0')}`;
  const start = new Date(ph);
  start.setDate(start.getDate() - 6);
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

  const salesData = await getSalesReport(startDate, endDate);
  const kitchenOrders = s.report_kitchen === 'true' ? await getKitchenReport(startDate, endDate) : null;

  const html = buildEmailHtml(
    'Weekly Sales Report',
    `Period: ${startDate} to ${endDate}`,
    s.business_name || 'Restaurant',
    salesData,
    kitchenOrders,
    s.currency || 'PHP'
  );

  const transporter = await createTransporter(s);
  await transporter.sendMail({
    from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
    to: s.owner_email,
    subject: `Weekly Report — ${startDate} to ${endDate} | ${s.business_name || 'Restaurant'}`,
    html,
  });
  console.log(`Weekly report sent to ${s.owner_email}`);
}

export async function sendMonthlyReport() {
  const s = await getSettings();
  if (s.report_monthly !== 'true' || !s.owner_email) return;

  const ph = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const year = ph.getFullYear();
  const month = ph.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(ph.getDate()).padStart(2, '0')}`;
  const monthName = ph.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' });

  const salesData = await getSalesReport(startDate, endDate);
  const kitchenOrders = s.report_kitchen === 'true' ? await getKitchenReport(startDate, endDate) : null;

  const html = buildEmailHtml(
    'Monthly Sales Report',
    `Month: ${monthName}`,
    s.business_name || 'Restaurant',
    salesData,
    kitchenOrders,
    s.currency || 'PHP'
  );

  const transporter = await createTransporter(s);
  await transporter.sendMail({
    from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
    to: s.owner_email,
    subject: `Monthly Report — ${monthName} | ${s.business_name || 'Restaurant'}`,
    html,
  });
  console.log(`Monthly report sent to ${s.owner_email}`);
}

export async function sendTestEmail() {
  const s = await getSettings();
  if (!s.owner_email) throw new Error('Owner email not configured.');

  const today = new Date();
  const ph = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const dateStr = `${ph.getFullYear()}-${String(ph.getMonth() + 1).padStart(2, '0')}-${String(ph.getDate()).padStart(2, '0')}`;
  const salesData = await getSalesReport(dateStr, dateStr);

  const html = buildEmailHtml(
    'Test Report — Email Configuration Check',
    `Sent: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`,
    s.business_name || 'Restaurant',
    salesData,
    null,
    s.currency || 'PHP'
  );

  const transporter = await createTransporter(s);
  await transporter.sendMail({
    from: `"${s.business_name || 'Restaurant POS'}" <${s.smtp_from || s.smtp_user}>`,
    to: s.owner_email,
    subject: `Test Email — ${s.business_name || 'Restaurant'} POS`,
    html,
  });
}
