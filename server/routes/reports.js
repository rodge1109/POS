import express from 'express';
import { sendCustomReport } from '../services/emailReports.js';
import pool from '../config/database.js';

const router = express.Router();
const DEFAULT_TIMEZONE = 'Asia/Manila';
const sanitizeTimezone = (tzRaw) => {
  const tz = String(tzRaw || '').trim();
  if (!tz) return DEFAULT_TIMEZONE;
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_\-+]+)+$/.test(tz)) return DEFAULT_TIMEZONE;
  return tz.replace(/'/g, "''");
};

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
    const tz = sanitizeTimezone(req.query.tz);
    const orderDateExpr = `(o.created_at::timestamptz AT TIME ZONE '${tz}')::date`;
    const company_id = req.company_id;

    const params = [company_id];
    let where = `
      o.company_id::text = $1::text
      AND LOWER(COALESCE(o.order_status, '')) NOT IN ('voided', 'refunded', 'cancelled')
      AND LOWER(COALESCE(oi.status, '')) <> 'voided'
    `;

    if (start) {
      params.push(start);
      where += ` AND ${orderDateExpr} >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      where += ` AND ${orderDateExpr} <= $${params.length}`;
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

/**
 * GET /api/reports/activity-logs
 * Unified operational timeline from orders, inventory, shifts, and schedules.
 */
router.get('/activity-logs', async (req, res) => {
  try {
    const { start, end, limit = 200, module = 'all' } = req.query;
    const tz = sanitizeTimezone(req.query.tz);
    const orderDateExpr = `(o.created_at::timestamptz AT TIME ZONE '${tz}')::date`;
    const inventoryDateExpr = `(it.created_at::timestamptz AT TIME ZONE '${tz}')::date`;
    const shiftDateExpr = `(s.start_time::timestamptz AT TIME ZONE '${tz}')::date`;
    const company_id = req.company_id;

    const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
    const params = [company_id];
    let p = params.length;

    let orderDateSql = '';
    let inventoryDateSql = '';
    let shiftDateSql = '';
    let scheduleDateSql = '';

    if (start) {
      params.push(start);
      p += 1;
      orderDateSql += ` AND ${orderDateExpr} >= $${p}`;
      inventoryDateSql += ` AND ${inventoryDateExpr} >= $${p}`;
      shiftDateSql += ` AND ${shiftDateExpr} >= $${p}`;
      scheduleDateSql += ` AND sch.shift_date >= $${p}`;
    }
    if (end) {
      params.push(end);
      p += 1;
      orderDateSql += ` AND ${orderDateExpr} <= $${p}`;
      inventoryDateSql += ` AND ${inventoryDateExpr} <= $${p}`;
      shiftDateSql += ` AND ${shiftDateExpr} <= $${p}`;
      scheduleDateSql += ` AND sch.shift_date <= $${p}`;
    }

    const moduleFilter = String(module || 'all').toLowerCase();
    const allowOrder = moduleFilter === 'all' || moduleFilter === 'orders';
    const allowInventory = moduleFilter === 'all' || moduleFilter === 'inventory';
    const allowShift = moduleFilter === 'all' || moduleFilter === 'shifts';
    const allowSchedule = moduleFilter === 'all' || moduleFilter === 'schedules';

    const unions = [];

    if (allowOrder) {
      unions.push(`
        SELECT
          o.created_at AS occurred_at,
          'orders'::text AS module,
          CASE
            WHEN LOWER(COALESCE(o.order_status, '')) IN ('voided','refunded','cancelled') THEN ('Order ' || COALESCE(o.order_status, 'Updated'))
            ELSE 'Order Recorded'
          END AS action,
          COALESCE(o.order_number, '#' || o.id::text) AS reference,
          COALESCE(e.name, 'System/Online') AS actor,
          COALESCE(o.service_type, o.order_type, 'n/a') AS details,
          COALESCE(o.total_amount, 0)::float AS amount
        FROM orders o
        LEFT JOIN shifts s ON s.id = o.shift_id AND s.company_id = o.company_id
        LEFT JOIN employees e ON e.id = s.employee_id AND e.company_id = s.company_id
        WHERE o.company_id = $1
          ${orderDateSql}
      `);
    }

    if (allowInventory) {
      unions.push(`
        SELECT
          it.created_at AS occurred_at,
          'inventory'::text AS module,
          CASE
            WHEN LOWER(COALESCE(it.transaction_type, '')) = 'receive' THEN 'Stock Received'
            WHEN LOWER(COALESCE(it.transaction_type, '')) = 'order_deduction' THEN 'Order Deduction'
            WHEN LOWER(COALESCE(it.transaction_type, '')) = 'product_deduction' THEN 'Product Deduction'
            ELSE 'Stock Adjustment'
          END AS action,
          COALESCE(p.name, i.name, 'Unknown Item') AS reference,
          COALESCE(it.created_by, 'system') AS actor,
          CONCAT('Qty ', COALESCE(it.quantity_change, 0), ' -> Bal ', COALESCE(it.quantity_after, 0)) AS details,
          NULL::float AS amount
        FROM inventory_transactions it
        LEFT JOIN ingredients i ON i.id = it.ingredient_id AND i.company_id = it.company_id
        LEFT JOIN products p ON p.id = it.product_id AND p.company_id = it.company_id
        WHERE it.company_id = $1
          ${inventoryDateSql}
      `);
    }

    if (allowShift) {
      unions.push(`
        SELECT
          s.start_time AS occurred_at,
          'shifts'::text AS module,
          CASE WHEN s.status = 'closed' THEN 'Shift Closed' ELSE 'Shift Started' END AS action,
          'Shift #' || s.id::text AS reference,
          COALESCE(e.name, 'Unknown Staff') AS actor,
          CONCAT('Opening: ', COALESCE(s.opening_cash, 0), ' | Closing: ', COALESCE(s.closing_cash, 0)) AS details,
          COALESCE(s.cash_variance, 0)::float AS amount
        FROM shifts s
        LEFT JOIN employees e ON e.id = s.employee_id AND e.company_id = s.company_id
        WHERE s.company_id = $1
          ${shiftDateSql}
      `);
    }

    const scheduleTableCheck = await pool.query(
      `SELECT to_regclass('public.employee_schedules')::text AS tbl`
    );
    const hasScheduleTable = Boolean(scheduleTableCheck.rows?.[0]?.tbl);

    if (allowSchedule && hasScheduleTable) {
      unions.push(`
        SELECT
          (sch.shift_date::timestamp + sch.start_time) AS occurred_at,
          'schedules'::text AS module,
          CASE
            WHEN sch.status = 'cancelled' THEN 'Schedule Cancelled'
            WHEN sch.status = 'published' THEN 'Schedule Published'
            ELSE 'Schedule Drafted'
          END AS action,
          COALESCE(emp.name, 'Unknown Staff') AS reference,
          COALESCE(creator.name, 'System') AS actor,
          CONCAT(
            TO_CHAR(sch.shift_date, 'YYYY-MM-DD'),
            ' ',
            TO_CHAR(sch.start_time, 'HH24:MI'),
            '-',
            TO_CHAR(sch.end_time, 'HH24:MI')
          ) AS details,
          NULL::float AS amount
        FROM employee_schedules sch
        LEFT JOIN employees emp ON emp.id = sch.employee_id AND emp.company_id = sch.company_id
        LEFT JOIN employees creator ON creator.id = sch.created_by AND creator.company_id = sch.company_id
        WHERE sch.company_id = $1
          ${scheduleDateSql}
      `);
    }

    if (unions.length === 0) {
      return res.json({ success: true, logs: [] });
    }

    params.push(maxLimit);
    const finalQuery = `
      SELECT *
      FROM (
        ${unions.join(' UNION ALL ')}
      ) logs
      ORDER BY occurred_at DESC
      LIMIT $${params.length}
    `;

    const result = await pool.query(finalQuery, params);
    res.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
  }
});

/**
 * GET /api/reports/dashboard-metrics
 * Supplies all data needed for the Main Analytics Dashboard.
 */
router.get('/dashboard-metrics', async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    const tz = sanitizeTimezone(req.query.tz);
    const company_id = req.company_id;

    let interval = '30 days';
    if (timeframe === 'week') interval = '7 days';
    if (timeframe === 'year') interval = '1 year';

    // 1. Basics Metrics
    const metricsRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0)::float as "totalRevenue",
        COUNT(*)::int as "totalOrders",
        COALESCE(AVG(total_amount), 0)::float as "avgOrderValue",
        COALESCE(AVG(total_items), 0)::float as "avgOrderSize",
        12 as "avgServiceTime"
      FROM orders
      WHERE company_id = $1
      AND created_at >= NOW() - INTERVAL '${interval}'
      AND LOWER(order_status) NOT IN ('voided', 'refunded', 'cancelled')
    `, [company_id]);

    // 2. Top & Low Products
    const itemsRes = await pool.query(`
      SELECT 
        COALESCE(oi.product_name, p.name, 'Unknown') as name,
        SUM(COALESCE(oi.quantity, 0))::float as quantity,
        SUM(COALESCE(oi.subtotal, 0))::float as revenue
      FROM order_items oi
      JOIN orders o ON o.id::text = oi.order_id::text AND o.company_id = oi.company_id
      LEFT JOIN products p ON p.id::text = oi.product_id::text
      WHERE o.company_id = $1
      AND o.created_at >= NOW() - INTERVAL '${interval}'
      AND LOWER(o.order_status) NOT IN ('voided', 'refunded', 'cancelled')
      GROUP BY COALESCE(oi.product_name, p.name, 'Unknown')
      ORDER BY revenue DESC
    `, [company_id]);

    const allRanked = itemsRes.rows;
    const topProducts = allRanked.slice(0, 5);
    const lowProducts = allRanked.length > 5 ? allRanked.slice(-5).reverse() : [];

    // 3. Revenue by Category
    const categoryRes = await pool.query(`
      SELECT 
        COALESCE(p.category, 'Uncategorized') as category,
        SUM(COALESCE(oi.subtotal, 0))::float as revenue
      FROM order_items oi
      JOIN orders o ON o.id::text = oi.order_id::text AND o.company_id = oi.company_id
      LEFT JOIN products p ON p.id::text = oi.product_id::text
      WHERE o.company_id = $1
      AND o.created_at >= NOW() - INTERVAL '${interval}'
      AND LOWER(o.order_status) NOT IN ('voided', 'refunded', 'cancelled')
      GROUP BY category
      ORDER BY revenue DESC
    `, [company_id]);

    const colors = ['#0891B2', '#4F46E5', '#8EC641', '#F59E0B', '#EF4444', '#EC4899'];
    const revenueByCategory = {
      labels: categoryRes.rows.map(r => r.category),
      datasets: [{
        data: categoryRes.rows.map(r => r.revenue),
        backgroundColor: categoryRes.rows.map((_, i) => colors[i % colors.length])
      }]
    };

    // 4. Sales History (Line Chart)
    const salesHistoryRes = await pool.query(`
      SELECT 
        TO_CHAR(date_trunc('day', (created_at::timestamptz AT TIME ZONE $2)), 'Mon DD') as date,
        SUM(total_amount)::float as daily_total
      FROM orders
      WHERE company_id = $1
      AND created_at >= NOW() - INTERVAL '${interval}'
      AND LOWER(order_status) NOT IN ('voided', 'refunded', 'cancelled')
      GROUP BY 1, date_trunc('day', (created_at::timestamptz AT TIME ZONE $2))
      ORDER BY date_trunc('day', (created_at::timestamptz AT TIME ZONE $2))
    `, [company_id, tz]);

    const salesData = {
      labels: salesHistoryRes.rows.map(r => r.date),
      datasets: [{
        label: 'Sales',
        data: salesHistoryRes.rows.map(r => r.daily_total),
        borderColor: '#0891B2',
        backgroundColor: 'rgba(8, 145, 178, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    res.json({
      success: true,
      metrics: metricsRes.rows[0],
      topProducts,
      lowProducts,
      revenueByCategory,
      salesData,
      profitData: salesData // Using sales for profit trend placeholder
    });

  } catch (error) {
    console.error('Error fetching dashboard-metrics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
