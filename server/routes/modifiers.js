import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

let ensured = false;
const ensureModifiersTable = async () => {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS modifiers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'addon',
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      company_id UUID REFERENCES companies(id),
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT modifiers_type_check CHECK (type IN ('addon', 'option')),
      CONSTRAINT modifiers_company_name_unique UNIQUE (company_id, name)
    )
  `);
  ensured = true;
};

router.get('/', async (req, res) => {
  try {
    await ensureModifiersTable();
    const { all } = req.query;
    const result = await pool.query(
      all === 'true'
        ? 'SELECT * FROM modifiers WHERE company_id = $1 ORDER BY name ASC'
        : 'SELECT * FROM modifiers WHERE active = true AND company_id = $1 ORDER BY name ASC',
      [req.company_id]
    );
    res.json({ success: true, modifiers: result.rows });
  } catch (error) {
    console.error('Error fetching modifiers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch modifiers' });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureModifiersTable();
    const { name, type = 'addon', price = 0, active = true } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanType = String(type || 'addon').toLowerCase();
    const cleanPrice = Number(price);

    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Modifier name is required' });
    }
    if (!['addon', 'option'].includes(cleanType)) {
      return res.status(400).json({ success: false, error: 'Invalid modifier type' });
    }
    if (!Number.isFinite(cleanPrice)) {
      return res.status(400).json({ success: false, error: 'Invalid modifier price' });
    }

    const result = await pool.query(
      `INSERT INTO modifiers (name, type, price, active, company_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cleanName, cleanType, cleanPrice, active !== false, req.company_id]
    );
    res.status(201).json({ success: true, modifier: result.rows[0] });
  } catch (error) {
    console.error('Error creating modifier:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, error: 'Modifier name already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create modifier' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await ensureModifiersTable();
    const { id } = req.params;
    const { name, type, price, active } = req.body || {};

    const current = await pool.query('SELECT * FROM modifiers WHERE id = $1 AND company_id = $2', [id, req.company_id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modifier not found' });
    }
    const existing = current.rows[0];

    const nextName = name !== undefined ? String(name).trim() : existing.name;
    const nextType = type !== undefined ? String(type).toLowerCase() : existing.type;
    const nextPrice = price !== undefined ? Number(price) : Number(existing.price);
    const nextActive = active !== undefined ? !!active : existing.active;

    if (!nextName) {
      return res.status(400).json({ success: false, error: 'Modifier name is required' });
    }
    if (!['addon', 'option'].includes(nextType)) {
      return res.status(400).json({ success: false, error: 'Invalid modifier type' });
    }
    if (!Number.isFinite(nextPrice)) {
      return res.status(400).json({ success: false, error: 'Invalid modifier price' });
    }

    const result = await pool.query(
      `UPDATE modifiers
       SET name = $1, type = $2, price = $3, active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND company_id = $6
       RETURNING *`,
      [nextName, nextType, nextPrice, nextActive, id, req.company_id]
    );
    res.json({ success: true, modifier: result.rows[0] });
  } catch (error) {
    console.error('Error updating modifier:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, error: 'Modifier name already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to update modifier' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureModifiersTable();
    const { id } = req.params;
    const result = await pool.query('DELETE FROM modifiers WHERE id = $1 AND company_id = $2 RETURNING id', [id, req.company_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modifier not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting modifier:', error);
    res.status(500).json({ success: false, error: 'Failed to delete modifier' });
  }
});

export default router;
