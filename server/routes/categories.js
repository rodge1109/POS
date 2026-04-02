import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

let ensured = false;
const ensureCategoriesTable = async () => {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      company_id UUID REFERENCES companies(id),
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT categories_company_name_unique UNIQUE (company_id, name)
    )
  `);
  ensured = true;
};

router.get('/', async (req, res) => {
  try {
    await ensureCategoriesTable();
    const result = await pool.query(
      'SELECT id, name FROM categories WHERE company_id = $1 ORDER BY name ASC',
      [req.company_id]
    );
    res.json({ success: true, categories: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureCategoriesTable();
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, company_id)
       VALUES ($1, $2)
       RETURNING id, name`,
      [name, req.company_id]
    );
    res.status(201).json({ success: true, category: result.rows[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, error: 'Category already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

router.put('/rename', async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureCategoriesTable();
    const from = String(req.body?.from || '').trim();
    const to = String(req.body?.to || '').trim();
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'Both "from" and "to" are required' });
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      return res.json({ success: true, renamedCategories: 0, updatedProducts: 0 });
    }

    await client.query('BEGIN');

    // Check duplicate target category
    const dup = await client.query(
      'SELECT id FROM categories WHERE company_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
      [req.company_id, to]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Target category already exists' });
    }

    const renameCat = await client.query(
      `UPDATE categories
       SET name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE company_id = $2 AND LOWER(name) = LOWER($3)`,
      [to, req.company_id, from]
    );

    const updateProducts = await client.query(
      `UPDATE products
       SET category = $1, updated_at = CURRENT_TIMESTAMP
       WHERE company_id = $2 AND category = $3`,
      [to, req.company_id, from]
    );

    if (renameCat.rowCount === 0 && updateProducts.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // If products were moved but category row did not exist before, ensure new category exists.
    if (renameCat.rowCount === 0 && updateProducts.rowCount > 0) {
      await client.query(
        `INSERT INTO categories (name, company_id)
         VALUES ($1, $2)
         ON CONFLICT (company_id, name) DO NOTHING`,
        [to, req.company_id]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      renamedCategories: renameCat.rowCount,
      updatedProducts: updateProducts.rowCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error renaming category:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, error: 'Target category already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to rename category' });
  } finally {
    client.release();
  }
});

export default router;
