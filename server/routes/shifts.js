 import express from 'express';
import pool from '../config/database.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// The custom getEmployee function is no longer needed as we use the global verifyToken middleware 
// which populates req.user and req.company_id automatically.


// POST /api/shifts/start
router.post('/start', async (req, res) => {
  try {
    const emp = req.user;
    if (!emp) return res.status(401).json({ success: false, error: 'Not logged in' });
    
    const { opening_cash, notes, forceNew } = req.body;
    const employeeId = emp.id;

    const existingShift = await pool.query(
      'SELECT * FROM shifts WHERE employee_id = $1 AND status = $2 AND company_id = $3',
      [employeeId, 'active', req.company_id]
    );

    // If there's an existing shift and forceNew is not true, return the existing one
    if (existingShift.rows.length > 0 && !forceNew) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active shift',
        existingShift: existingShift.rows[0],
        requiresAction: true
      });
    }

    // If forceNew and there's an existing shift, close it first
    if (existingShift.rows.length > 0 && forceNew) {
      await pool.query(
        'UPDATE shifts SET status = $1 WHERE employee_id = $2 AND status = $3 AND company_id = $4',
        ['closed', employeeId, 'active', req.company_id]
      );
    }

    const result = await pool.query(
      `INSERT INTO shifts (employee_id, opening_cash, notes, company_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [employeeId, opening_cash || 0, notes || null, req.company_id]
    );

    res.status(201).json({
      success: true,
      shift: { ...result.rows[0], employee_name: emp.name }
    });
  } catch (error) {
    console.error('Error starting shift:', error);
    console.error('Error details - employee:', req.user, 'company_id:', req.company_id);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    res.status(500).json({ success: false, error: 'Failed to start shift: ' + error.message });
  }
});

// POST /api/shifts/end
router.post('/end', async (req, res) => {
  try {
    const emp = req.user;
    if (!emp) return res.status(401).json({ success: false, error: 'Not logged in' });
    
    const { closing_cash, notes, shift_id } = req.body;
    const employeeId = emp.id;

    console.log('End shift: Looking for active shift for employee:', employeeId, 'Shift ID:', shift_id);

    // If shift_id is provided, use it; otherwise find the active shift
    let shiftQuery;
    let shiftParams;
    
    if (shift_id) {
      shiftQuery = 'SELECT * FROM shifts WHERE id = $1 AND status = $2 AND company_id = $3';
      shiftParams = [shift_id, 'active', req.company_id];
    } else {
      shiftQuery = 'SELECT * FROM shifts WHERE employee_id = $1 AND status = $2 AND company_id = $3';
      shiftParams = [employeeId, 'active', req.company_id];
    }

    const shiftResult = await pool.query(shiftQuery, shiftParams);
    
    console.log('Shift query result:', shiftResult.rows.length, 'rows found');

    if (shiftResult.rows.length === 0) {
      // More helpful debugging info
      const allShifts = await pool.query(
        'SELECT id, employee_id, status FROM shifts WHERE employee_id = $1 AND company_id = $2 ORDER BY created_at DESC LIMIT 5',
        [employeeId, req.company_id]
      );
      console.log('Recent shifts for employee:', allShifts.rows);
      
      return res.status(400).json({ 
        success: false, 
        error: 'No active shift found for this employee',
        recentShifts: allShifts.rows
      });
    }

    const shift = shiftResult.rows[0];
    console.log('Found shift:', shift.id, 'Status:', shift.status);

    const salesResult = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as order_count
       FROM orders WHERE shift_id = $1 AND company_id = $2`,
      [shift.id, req.company_id]
    );

    const { cash_sales, total_sales, order_count } = salesResult.rows[0];
    const expectedCash = parseFloat(shift.opening_cash) + parseFloat(cash_sales);
    const cashVariance = parseFloat(closing_cash || 0) - expectedCash;

    const updateResult = await pool.query(
      `UPDATE shifts
       SET end_time = CURRENT_TIMESTAMP,
           closing_cash = $1,
           expected_cash = $2,
           cash_variance = $3,
           status = 'closed',
           notes = COALESCE($4, notes)
       WHERE id = $5 AND company_id = $6 RETURNING *`,
      [closing_cash || 0, expectedCash, cashVariance, notes, shift.id, req.company_id]
    );

    const breakdownResult = await pool.query(
      `SELECT payment_method, COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total
       FROM orders WHERE shift_id = $1 AND company_id = $2
       GROUP BY payment_method`,
      [shift.id, req.company_id]
    );

    const salesBreakdown = {};
    breakdownResult.rows.forEach(row => {
      salesBreakdown[row.payment_method] = {
        count: parseInt(row.order_count),
        total: parseFloat(row.total)
      };
    });

    res.json({
      success: true,
      data: {
        shift: updateResult.rows[0],
        report: {
          employee_name: emp.name,
          start_time: shift.start_time,
          end_time: updateResult.rows[0].end_time,
          opening_cash: parseFloat(shift.opening_cash),
          closing_cash: parseFloat(closing_cash || 0),
          expected_cash: expectedCash,
          cash_variance: cashVariance,
          total_sales: parseFloat(total_sales),
          order_count: parseInt(order_count),
          sales_by_method: salesBreakdown
        }
      }
    });
  } catch (error) {
    console.error('Error ending shift:', error);
    res.status(500).json({ success: false, error: 'Failed to end shift' });
  }
});

// GET /api/shifts/current
router.get('/current', async (req, res) => {
  try {
    const emp = req.user;
    if (!emp) return res.status(401).json({ success: false, error: 'Not logged in' });

    const employeeId = emp.id;

    const result = await pool.query(
      `SELECT s.*, e.name as employee_name
       FROM shifts s
       JOIN employees e ON s.employee_id = e.id AND s.company_id = e.company_id
       WHERE s.employee_id = $1 AND s.status = $2 AND s.company_id = $3`,
      [employeeId, 'active', req.company_id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: { shift: null } });
    }

    const salesResult = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as order_count
       FROM orders WHERE shift_id = $1 AND company_id = $2`,
      [result.rows[0].id, req.company_id]
    );

    res.json({
      success: true,
      data: {
        shift: {
          ...result.rows[0],
          running_total: parseFloat(salesResult.rows[0].total_sales),
          cash_sales: parseFloat(salesResult.rows[0].cash_sales),
          order_count: parseInt(salesResult.rows[0].order_count)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching current shift:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch current shift' });
  }
});

// GET /api/shifts/:id/report
router.get('/:id/report', async (req, res) => {
  try {
    const emp = req.user;
    if (!emp) return res.status(401).json({ success: false, error: 'Not logged in' });

    const { id } = req.params;

    const shiftResult = await pool.query(
      `SELECT s.*, e.name as employee_name
       FROM shifts s
       JOIN employees e ON s.employee_id = e.id AND s.company_id = e.company_id
       WHERE s.id = $1 AND s.company_id = $2`,
      [id, req.company_id]
    );

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shift not found' });
    }

    const shift = shiftResult.rows[0];

    // Authorization: Own shift or admin/manager
    if (shift.employee_id !== emp.id && !['admin', 'manager'].includes(emp.role)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const methodResult = await pool.query(
      `SELECT payment_method, COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total
       FROM orders WHERE shift_id = $1 AND company_id = $2
       GROUP BY payment_method`,
      [id, req.company_id]
    );

    const serviceResult = await pool.query(
      `SELECT service_type, COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total
       FROM orders WHERE shift_id = $1 AND company_id = $2
       GROUP BY service_type`,
      [id, req.company_id]
    );

    const itemsResult = await pool.query(
      `SELECT oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id AND oi.company_id = o.company_id
       WHERE o.shift_id = $1 AND o.company_id = $2
       GROUP BY oi.product_name
       ORDER BY total_quantity DESC LIMIT 10`,
      [id, req.company_id]
    );

    const ordersResult = await pool.query(
      `SELECT id, order_number, total_amount, payment_method, service_type, created_at
       FROM orders WHERE shift_id = $1 AND company_id = $2
       ORDER BY created_at DESC`,
      [id, req.company_id]
    );

    const salesByMethod = {};
    let totalSales = 0;
    let totalOrders = 0;
    methodResult.rows.forEach(row => {
      salesByMethod[row.payment_method] = {
        count: parseInt(row.order_count),
        total: parseFloat(row.total)
      };
      totalSales += parseFloat(row.total);
      totalOrders += parseInt(row.order_count);
    });

    const salesByService = {};
    serviceResult.rows.forEach(row => {
      salesByService[row.service_type || 'dine-in'] = {
        count: parseInt(row.order_count),
        total: parseFloat(row.total)
      };
    });

    res.json({
      success: true,
      data: {
        report: {
          shift: {
            id: shift.id,
            employee_name: shift.employee_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            status: shift.status
          },
          cash_drawer: {
            opening_cash: parseFloat(shift.opening_cash),
            closing_cash: shift.closing_cash ? parseFloat(shift.closing_cash) : null,
            expected_cash: shift.expected_cash ? parseFloat(shift.expected_cash) : null,
            variance: shift.cash_variance ? parseFloat(shift.cash_variance) : null
          },
          sales: {
            total: totalSales,
            order_count: totalOrders,
            by_payment_method: salesByMethod,
            by_service_type: salesByService
          },
          top_items: itemsResult.rows.map(item => ({
            name: item.product_name,
            quantity: parseInt(item.total_quantity),
            revenue: parseFloat(item.total_revenue)
          })),
          orders: ordersResult.rows
        }
      }
    });
  } catch (error) {
    console.error('Error fetching shift report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shift report' });
  }
});

// GET /api/shifts
router.get('/', async (req, res) => {
  try {
    const emp = req.user;
    if (!emp) return res.status(401).json({ success: false, error: 'Not logged in' });

    const { employee_id, status, start_date, end_date, limit = 50 } = req.query;

    let query = `
      SELECT s.*, e.name as employee_name,
        (SELECT COUNT(*) FROM orders WHERE shift_id = s.id AND company_id = s.company_id) as order_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE shift_id = s.id AND company_id = s.company_id) as total_sales
      FROM shifts s
      JOIN employees e ON s.employee_id = e.id AND s.company_id = e.company_id
      WHERE s.company_id = $1
    `;
    const params = [req.company_id];

    if (!['admin', 'manager'].includes(emp.role)) {
      params.push(emp.id);
      query += ` AND s.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      query += ` AND s.employee_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND s.start_time >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND s.start_time <= $${params.length}`;
    }

    query += ` ORDER BY s.start_time DESC`;
    params.push(limit);
    query += ` LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        shifts: result.rows.map(shift => ({
          ...shift,
          order_count: parseInt(shift.order_count),
          total_sales: parseFloat(shift.total_sales)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shifts' });
  }
});

export default router;