 import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// POST /api/auth/verify-company - Verify company PIN
router.post('/verify-company', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'Company PIN is required' });
    }

    const result = await pool.query(
      'SELECT id, name FROM companies WHERE login_pin::text = $1',
      [pin]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid Company PIN' });
    }

    res.json({
      success: true,
      company_id: result.rows[0].id,
      company_name: result.rows[0].name
    });
  } catch (error) {
    console.error('Company verify error:', error);
    res.status(500).json({ success: false, error: 'Verification failed: ' + error.message });
  }
});

// POST /api/auth/login - Employee login via PIN
router.post('/login', async (req, res) => {
  try {
    const { pin, company_id } = req.body;
    console.log('Login attempt with PIN:', pin, 'for Company:', company_id);

    if (!pin) {
      console.log('Missing PIN');
      return res.status(400).json({
        success: false,
        error: 'PIN is required'
      });
    }

    // Find employee by PIN - Scoped by company_id if provided
    let query = `
      SELECT e.id, e.username, e.name, e.role, e.active, e.company_id, e.permissions, c.name as company_name 
      FROM employees e
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE e."PIN"::text = $1 AND e.active = true
    `;
    let params = [pin];

    if (company_id) {
      query += ' AND e.company_id = $2';
      params.push(company_id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN'
      });
    }

    const employee = result.rows[0];

    // Create JWT token (for stateless auth)
    // We now include company_id in the token
    const token = jwt.sign(
      { 
        id: employee.id, 
        username: employee.username, 
        role: employee.role,
        company_id: employee.company_id, // CRITICAL for multi-tenancy
        permissions: employee.permissions
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '8h' }
    );

    // Return employee data
    const employeeData = {
      id: employee.id,
      username: employee.username,
      name: employee.name,
      role: employee.role,
      company_id: employee.company_id,
      permissions: employee.permissions
    };

    console.log('Login successful for:', employee.name);

      res.json({
      success: true,
      employee: employeeData,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed: ' + error.message });
  }
});

/**
 * POST /api/auth/register-company
 * Atomic registration of a new company and its first admin user.
 */
router.post('/register-company', async (req, res) => {
  const client = await pool.connect();
  try {
    const { companyName, ownerName, email, password, pin } = req.body;

    if (!companyName || !ownerName || !email || !password || !pin) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    await client.query('BEGIN');

    // 1. Create Company
    // Generate a default login PIN (6 digits) or use provided
    const loginPin = req.body.loginPin || Math.floor(100000 + Math.random() * 900000).toString();
    
    const companyResult = await client.query(
      'INSERT INTO companies (name, login_pin) VALUES ($1, $2) RETURNING id',
      [companyName, loginPin]
    );
    const companyId = companyResult.rows[0].id;

    // 2. Create Admin Employee
    // Note: In a real app we would use bcrypt for password_hash
    const employeeResult = await client.query(
      `INSERT INTO employees (username, name, email, role, "PIN", password_hash, company_id) 
       VALUES ($1, $2, $3, 'admin', $4, $5, $6) RETURNING id`,
      [email.toLowerCase(), ownerName, email.toLowerCase(), pin, password, companyId]
    );

    // 3. Create Default Settings for the company
    const defaultSettings = [
      { key: 'store_name', value: companyName },
      { key: 'tax_rate', value: '12' },
      { key: 'currency', value: 'PHP' }
    ];

    for (const setting of defaultSettings) {
      await client.query(
        'INSERT INTO system_settings (key, value, company_id) VALUES ($1, $2, $3)',
        [setting.key, setting.value, companyId]
      );
    }

    await client.query('COMMIT');

    const employee = {
      id: employeeResult.rows[0].id,
      username: email.toLowerCase(),
      name: ownerName,
      role: 'admin',
      company_id: companyId
    };

    const token = jwt.sign(
      { id: employee.id, username: employee.username, role: employee.role, company_id: employee.company_id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '8h' }
    );

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      employee,
      token
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/admin-login - Admin login via email/password
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find admin by email and password
    // Join with companies to get the company name for the device context
    const result = await pool.query(
      `SELECT e.id, e.username, e.name, e.role, e.company_id, e.permissions, c.name as company_name 
       FROM employees e 
       LEFT JOIN companies c ON e.company_id = c.id
       WHERE (e.username = $1 OR e.email = $1) AND e.password_hash = $2 AND e.role = $3 AND e.active = true`,
      [email.toLowerCase(), password, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or not an administrator'
      });
    }

    const employee = result.rows[0];

    // Create JWT token
    const token = jwt.sign(
      { 
        id: employee.id, 
        username: employee.username, 
        role: employee.role,
        company_id: employee.company_id,
        permissions: employee.permissions
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      employee,
      token: token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Admin login failed' });
  }
});

// POST /api/auth/logout - Employee logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me - Get current logged in employee (requires token)
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    res.json({
      success: true,
      employee: decoded
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Quick log to see if request even arrives
    try {
      const logPath = path.join(process.cwd(), 'import_log.txt');
      fs.appendFileSync(logPath, `${new Date().toISOString()} - [AUTH] ${req.method} ${req.originalUrl}\n`);
    } catch (e) {}

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    req.user = decoded;
    req.company_id = decoded.company_id; // Inject company context into the request object!
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// POST /api/auth/change-password - Change PIN (requires token)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;

    if (!currentPin || !newPin) {
      return res.status(400).json({ success: false, error: 'Current and new PIN are required' });
    }

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      return res.status(400).json({ success: false, error: 'New PIN must be 4 digits' });
    }

    // Get current employee
    const result = await pool.query(
      'SELECT * FROM employees WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const employee = result.rows[0];

    // Verify current PIN
    if (String(employee.PIN) !== currentPin) {
      return res.status(401).json({ success: false, error: 'Current PIN is incorrect' });
    }

    // Update PIN
    await pool.query(
      'UPDATE employees SET "PIN" = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPin, req.user.id]
    );

    res.json({ success: true, message: 'PIN changed successfully' });
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ success: false, error: 'Failed to change PIN' });
  }
});

// GET /api/auth/employees - Get all employees (admin only)
router.get('/employees', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const result = await pool.query(
      'SELECT id, username, name, role, active, permissions, created_at FROM employees WHERE company_id = $1 ORDER BY name',
      [req.company_id]
    );

    res.json({ success: true, employees: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

// POST /api/auth/employees - Create new employee (admin only)
router.post('/employees', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { username, pin, name, role } = req.body;

    if (!username || !pin || !name || !role) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ success: false, error: 'PIN must be 4 digits' });
    }

    if (!['admin', 'manager', 'cashier', 'waiter'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // Check if username exists
    const existingUser = await pool.query(
      'SELECT id FROM employees WHERE username = $1 AND company_id = $2',
      [username.toLowerCase().trim(), req.company_id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists in this company' });
    }

    // Check if PIN exists
    const existingPin = await pool.query(
      'SELECT id FROM employees WHERE "PIN"::text = $1 AND company_id = $2',
      [pin, req.company_id]
    );

    if (existingPin.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'PIN already in use by another employee' });
    }

    const result = await pool.query(
      `INSERT INTO employees (username, "PIN", name, role, company_id, password_hash)
       VALUES ($1, $2, $3, $4, $5, $2)
       RETURNING id, username, name, role, active, created_at`,
      [username.toLowerCase().trim(), pin, name, role, req.company_id]
    );

    res.status(201).json({ success: true, employee: result.rows[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, error: 'Failed to create employee' });
  }
});

// PUT /api/auth/employees/:id - Update employee (admin only)
router.put('/employees/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, role, active, pin } = req.body;

    let query = 'UPDATE employees SET name = $1, role = $2, active = $3, updated_at = CURRENT_TIMESTAMP';
    let params = [name, role, active];
    let paramCount = 4;

    // If PIN provided, update it too
    if (pin) {
      if (pin.length !== 4 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ success: false, error: 'PIN must be 4 digits' });
      }

      // Check if PIN is already in use by another employee in this company
      const existingPin = await pool.query(
        'SELECT id FROM employees WHERE "PIN"::text = $1 AND id != $2 AND company_id = $3',
        [pin, id, req.company_id]
      );

      if (existingPin.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'PIN already in use' });
      }

      query += `, "PIN" = $${paramCount}`;
      params.push(pin);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING id, username, name, role, active`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, employee: result.rows[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, error: 'Failed to update employee' });
  }
});

// PUT /api/auth/employees/:id/permissions - Update employee permissions (admin only)
router.put('/employees/:id/permissions', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'Permissions must be an array' });
    }

    const result = await pool.query(
      'UPDATE employees SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 RETURNING id, permissions',
      [JSON.stringify(permissions), id, req.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, permissions: result.rows[0].permissions });
  } catch (error) {
    console.error('Error updating employee permissions:', error);
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
});

export default router;