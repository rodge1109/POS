import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

let initPromise = null;

const ensureSchedulesTable = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS employee_schedules (
          id SERIAL PRIMARY KEY,
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          shift_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          break_minutes INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
          notes TEXT,
          created_by INTEGER REFERENCES employees(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT employee_schedules_status_check CHECK (status IN ('scheduled', 'published', 'cancelled')),
          CONSTRAINT employee_schedules_break_check CHECK (break_minutes >= 0)
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_employee_schedules_company_date
        ON employee_schedules(company_id, shift_date)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date
        ON employee_schedules(employee_id, shift_date)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS employee_schedule_templates (
          id SERIAL PRIMARY KEY,
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          day_of_week INTEGER NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          break_minutes INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          notes TEXT,
          created_by INTEGER REFERENCES employees(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT employee_schedule_templates_dow_check CHECK (day_of_week >= 0 AND day_of_week <= 6),
          CONSTRAINT employee_schedule_templates_break_check CHECK (break_minutes >= 0)
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_schedule_templates_company_employee
        ON employee_schedule_templates(company_id, employee_id, day_of_week)
      `);
    })();
  }

  return initPromise;
};

router.use(async (req, res, next) => {
  try {
    await ensureSchedulesTable();
    next();
  } catch (error) {
    console.error('Failed to initialize employee_schedules table:', error);
    res.status(500).json({ success: false, error: 'Schedule module initialization failed' });
  }
});

const canManageSchedules = (user) => ['admin', 'manager'].includes(user?.role);

const validateScheduleInput = ({ employee_id, shift_date, start_time, end_time, break_minutes }) => {
  if (!employee_id || !shift_date || !start_time || !end_time) {
    return 'employee_id, shift_date, start_time, and end_time are required';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(shift_date))) {
    return 'shift_date must be in YYYY-MM-DD format';
  }

  if (!/^\d{2}:\d{2}/.test(String(start_time)) || !/^\d{2}:\d{2}/.test(String(end_time))) {
    return 'start_time and end_time must be in HH:MM format';
  }

  if (start_time >= end_time) {
    return 'end_time must be later than start_time';
  }

  if (break_minutes != null && (Number.isNaN(Number(break_minutes)) || Number(break_minutes) < 0)) {
    return 'break_minutes must be 0 or greater';
  }

  return null;
};

const ensureEmployeeInCompany = async (employeeId, companyId) => {
  const result = await pool.query(
    `SELECT id, name, role, active
     FROM employees
     WHERE id = $1 AND company_id = $2`,
    [employeeId, companyId]
  );
  return result.rows[0] || null;
};

const toDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const weekRangeFromMonday = (weekStart) => {
  const start = toDateOnly(weekStart);
  if (!start) return null;
  return { start, end: addDays(start, 6) };
};

const hasOverlap = async ({
  company_id,
  employee_id,
  shift_date,
  start_time,
  end_time,
  exclude_id = null
}) => {
  const params = [company_id, employee_id, shift_date, start_time, end_time];
  let query = `
    SELECT id
    FROM employee_schedules
    WHERE company_id = $1
      AND employee_id = $2
      AND shift_date = $3
      AND status <> 'cancelled'
      AND start_time < $5::time
      AND end_time > $4::time
  `;

  if (exclude_id) {
    params.push(exclude_id);
    query += ` AND id <> $${params.length}`;
  }

  query += ' LIMIT 1';
  const result = await pool.query(query, params);
  return result.rows.length > 0;
};

// GET /api/schedules
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, employee_id } = req.query;
    const params = [req.company_id];

    let query = `
      SELECT
        s.*,
        e.name AS employee_name,
        ROUND(GREATEST(
          (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) - (COALESCE(s.break_minutes, 0) / 60.0),
          0
        )::numeric, 2) AS scheduled_hours
      FROM employee_schedules s
      JOIN employees e ON e.id = s.employee_id AND e.company_id = s.company_id
      WHERE s.company_id = $1
    `;

    if (canManageSchedules(req.user)) {
      if (employee_id) {
        params.push(employee_id);
        query += ` AND s.employee_id = $${params.length}`;
      }
    } else {
      params.push(req.user.id);
      query += ` AND s.employee_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND s.shift_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND s.shift_date <= $${params.length}`;
    }

    query += ' ORDER BY s.shift_date ASC, s.start_time ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, schedules: result.rows });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedules' });
  }
});

// GET /api/schedules/metrics
router.get('/metrics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const params = [req.company_id];
    let where = `s.company_id = $1 AND s.status <> 'cancelled'`;

    if (start_date) {
      params.push(start_date);
      where += ` AND s.shift_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      where += ` AND s.shift_date <= $${params.length}`;
    }

    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS shifts_count,
        ROUND(COALESCE(SUM(GREATEST(
          (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) - (COALESCE(s.break_minutes, 0) / 60.0),
          0
        )), 0)::numeric, 2) AS total_hours,
        ROUND(COALESCE(AVG(GREATEST(
          (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) - (COALESCE(s.break_minutes, 0) / 60.0),
          0
        )), 0)::numeric, 2) AS avg_hours_per_shift
      FROM employee_schedules s
      WHERE ${where}
      `,
      params
    );

    const perDayResult = await pool.query(
      `
      SELECT
        s.shift_date,
        ROUND(COALESCE(SUM(GREATEST(
          (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) - (COALESCE(s.break_minutes, 0) / 60.0),
          0
        )), 0)::numeric, 2) AS total_hours
      FROM employee_schedules s
      WHERE ${where}
      GROUP BY s.shift_date
      ORDER BY s.shift_date ASC
      `,
      params
    );

    const perEmployeeResult = await pool.query(
      `
      SELECT
        s.employee_id,
        e.name AS employee_name,
        ROUND(COALESCE(SUM(GREATEST(
          (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) - (COALESCE(s.break_minutes, 0) / 60.0),
          0
        )), 0)::numeric, 2) AS total_hours
      FROM employee_schedules s
      JOIN employees e ON e.id = s.employee_id AND e.company_id = s.company_id
      WHERE ${where}
      GROUP BY s.employee_id, e.name
      ORDER BY total_hours DESC
      `,
      params
    );

    res.json({
      success: true,
      metrics: {
        summary: summaryResult.rows[0],
        by_day: perDayResult.rows,
        by_employee: perEmployeeResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching schedule metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedule metrics' });
  }
});

// GET /api/schedules/templates
router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT t.*, e.name AS employee_name
      FROM employee_schedule_templates t
      JOIN employees e ON e.id = t.employee_id AND e.company_id = t.company_id
      WHERE t.company_id = $1
      ORDER BY e.name ASC, t.day_of_week ASC, t.start_time ASC
      `,
      [req.company_id]
    );
    res.json({ success: true, templates: result.rows });
  } catch (error) {
    console.error('Error fetching schedule templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedule templates' });
  }
});

// POST /api/schedules/templates
router.post('/templates', async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin or manager access required' });
    }

    const {
      employee_id,
      day_of_week,
      start_time,
      end_time,
      break_minutes = 0,
      is_active = true,
      notes = null
    } = req.body;

    if (!employee_id || day_of_week == null || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'employee_id, day_of_week, start_time, end_time are required' });
    }
    if (!Number.isInteger(Number(day_of_week)) || Number(day_of_week) < 0 || Number(day_of_week) > 6) {
      return res.status(400).json({ success: false, error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' });
    }
    if (start_time >= end_time) {
      return res.status(400).json({ success: false, error: 'end_time must be later than start_time' });
    }

    const employee = await ensureEmployeeInCompany(employee_id, req.company_id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found in this company' });
    }

    const result = await pool.query(
      `
      INSERT INTO employee_schedule_templates
      (company_id, employee_id, day_of_week, start_time, end_time, break_minutes, is_active, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        req.company_id,
        employee_id,
        Number(day_of_week),
        start_time,
        end_time,
        Number(break_minutes) || 0,
        Boolean(is_active),
        notes,
        req.user.id
      ]
    );

    res.status(201).json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Error creating schedule template:', error);
    res.status(500).json({ success: false, error: 'Failed to create schedule template' });
  }
});

// DELETE /api/schedules/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin or manager access required' });
    }
    const result = await pool.query(
      'DELETE FROM employee_schedule_templates WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.company_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, deleted_id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting schedule template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete schedule template' });
  }
});

// POST /api/schedules/templates/apply
router.post('/templates/apply', async (req, res) => {
  const client = await pool.connect();
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin or manager access required' });
    }

    const { week_start, status = 'scheduled' } = req.body;
    if (!['scheduled', 'published'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be scheduled or published' });
    }
    const range = weekRangeFromMonday(week_start);
    if (!range) {
      return res.status(400).json({ success: false, error: 'week_start is required (YYYY-MM-DD)' });
    }

    await client.query('BEGIN');
    const templateResult = await client.query(
      `
      SELECT *
      FROM employee_schedule_templates
      WHERE company_id = $1 AND is_active = true
      ORDER BY employee_id ASC, day_of_week ASC
      `,
      [req.company_id]
    );

    let inserted = 0;
    for (const t of templateResult.rows) {
      const weekday = Number(t.day_of_week);
      const offsetFromMonday = weekday === 0 ? 6 : weekday - 1;
      const shiftDate = addDays(range.start, offsetFromMonday);
      const overlapResult = await client.query(
        `
        SELECT id
        FROM employee_schedules
        WHERE company_id = $1
          AND employee_id = $2
          AND shift_date = $3
          AND status <> 'cancelled'
          AND start_time < $5::time
          AND end_time > $4::time
        LIMIT 1
        `,
        [req.company_id, t.employee_id, shiftDate, t.start_time, t.end_time]
      );
      if (overlapResult.rows.length) {
        continue;
      }

      await client.query(
        `
        INSERT INTO employee_schedules
        (company_id, employee_id, shift_date, start_time, end_time, break_minutes, status, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          req.company_id,
          t.employee_id,
          shiftDate,
          t.start_time,
          t.end_time,
          Number(t.break_minutes) || 0,
          status,
          t.notes,
          req.user.id
        ]
      );
      inserted += 1;
    }

    await client.query('COMMIT');
    res.json({ success: true, inserted, week_start: range.start, week_end: range.end });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying schedule templates:', error);
    res.status(500).json({ success: false, error: 'Failed to apply schedule templates' });
  } finally {
    client.release();
  }
});

// POST /api/schedules/publish-week
router.post('/publish-week', async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin or manager access required' });
    }
    const { week_start } = req.body;
    const range = weekRangeFromMonday(week_start);
    if (!range) {
      return res.status(400).json({ success: false, error: 'week_start is required (YYYY-MM-DD)' });
    }

    const result = await pool.query(
      `
      UPDATE employee_schedules
      SET status = 'published', updated_at = CURRENT_TIMESTAMP
      WHERE company_id = $1
        AND shift_date >= $2
        AND shift_date <= $3
        AND status = 'scheduled'
      RETURNING id
      `,
      [req.company_id, range.start, range.end]
    );

    res.json({ success: true, published: result.rowCount, week_start: range.start, week_end: range.end });
  } catch (error) {
    console.error('Error publishing schedules for week:', error);
    res.status(500).json({ success: false, error: 'Failed to publish schedules for week' });
  }
});

// POST /api/schedules
router.post('/', async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin or manager access required' });
    }

    const {
      employee_id,
      shift_date,
      start_time,
      end_time,
      break_minutes = 0,
      status = 'scheduled',
      notes = null
    } = req.body;

    const validationError = validateScheduleInput({
      employee_id,
      shift_date,
      start_time,
      end_time,
      break_minutes
    });
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    if (!['scheduled', 'published', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const employee = await ensureEmployeeInCompany(employee_id, req.company_id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found in this company' });
    }

    const overlap = await hasOverlap({
      company_id: req.company_id,
      employee_id,
      shift_date,
      start_time,
      end_time
    });
    if (overlap) {
      return res.status(409).json({ success: false, error: 'Schedule conflict: overlapping shift exists for this employee' });
    }

    const result = await pool.query(
      `INSERT INTO employee_schedules
      (company_id, employee_id, shift_date, start_time, end_time, break_minutes, status, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.company_id,
        employee_id,
        shift_date,
        start_time,
        end_time,
        Number(break_minutes) || 0,
        status,
        notes,
        req.user.id
      ]
    );

    res.status(201).json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin or manager access required' });
    }

    const { id } = req.params;
    const currentResult = await pool.query(
      'SELECT * FROM employee_schedules WHERE id = $1 AND company_id = $2',
      [id, req.company_id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    const current = currentResult.rows[0];
    const payload = {
      employee_id: req.body.employee_id ?? current.employee_id,
      shift_date: req.body.shift_date ?? current.shift_date,
      start_time: req.body.start_time ?? current.start_time,
      end_time: req.body.end_time ?? current.end_time,
      break_minutes: req.body.break_minutes ?? current.break_minutes
    };

    const validationError = validateScheduleInput(payload);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const status = req.body.status ?? current.status;
    if (!['scheduled', 'published', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const employee = await ensureEmployeeInCompany(payload.employee_id, req.company_id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found in this company' });
    }

    const overlap = await hasOverlap({
      company_id: req.company_id,
      employee_id: payload.employee_id,
      shift_date: payload.shift_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      exclude_id: id
    });
    if (overlap) {
      return res.status(409).json({ success: false, error: 'Schedule conflict: overlapping shift exists for this employee' });
    }

    const result = await pool.query(
      `UPDATE employee_schedules
       SET employee_id = $1,
           shift_date = $2,
           start_time = $3,
           end_time = $4,
           break_minutes = $5,
           status = $6,
           notes = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND company_id = $9
       RETURNING *`,
      [
        payload.employee_id,
        payload.shift_date,
        payload.start_time,
        payload.end_time,
        Number(payload.break_minutes) || 0,
        status,
        req.body.notes ?? current.notes,
        id,
        req.company_id
      ]
    );

    res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id (soft cancel)
router.delete('/:id', async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ success: false, error: 'Admin or manager access required' });
    }

    const { id } = req.params;
    const result = await pool.query(
      `UPDATE employee_schedules
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND company_id = $2
       RETURNING id, status`,
      [id, req.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    res.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error cancelling schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel schedule' });
  }
});

export default router;
