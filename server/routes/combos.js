import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all combos with their items
// Use ?all=true to include inactive combos (for management)
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    const combosResult = await pool.query(
      all === 'true'
        ? 'SELECT * FROM combos WHERE company_id = $1 ORDER BY name'
        : 'SELECT * FROM combos WHERE active = true AND company_id = $1 ORDER BY name',
      [req.company_id]
    );

    const combos = await Promise.all(combosResult.rows.map(async (combo) => {
      const itemsResult = await pool.query(
        `SELECT ci.*, p.name as product_name, p.category as product_category
         FROM combo_items ci
         JOIN products p ON ci.product_id = p.id AND ci.company_id = p.company_id
         WHERE ci.combo_id = $1 AND ci.company_id = $2`,
        [combo.id, req.company_id]
      );

      return {
        ...combo,
        price: parseFloat(combo.price),
        active: combo.active,
        items: itemsResult.rows.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          quantity: item.quantity,
          size_name: item.size_name
        }))
      };
    }));

    res.json({ success: true, combos });
  } catch (error) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch combos' });
  }
});

// GET single combo with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const comboResult = await pool.query(
      'SELECT * FROM combos WHERE id = $1 AND company_id = $2',
      [id, req.company_id]
    );

    if (comboResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combo not found' });
    }

    const combo = comboResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT ci.*, p.name as product_name, p.category as product_category
       FROM combo_items ci
       JOIN products p ON ci.product_id = p.id AND ci.company_id = p.company_id
       WHERE ci.combo_id = $1 AND ci.company_id = $2`,
      [id, req.company_id]
    );

    res.json({
      success: true,
      combo: {
        ...combo,
        price: parseFloat(combo.price),
        items: itemsResult.rows.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_category: item.product_category,
          quantity: item.quantity,
          size_name: item.size_name
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching combo:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch combo' });
  }
});

// POST create combo
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, price, image, active, items } = req.body;

    if (!name || !price || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name, price, and at least one item are required'
      });
    }

    await client.query('BEGIN');

    const comboResult = await client.query(
      `INSERT INTO combos (name, description, price, image, active, company_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, image, active !== false, req.company_id]
    );

    const combo = comboResult.rows[0];

    // Insert combo items
    for (const item of items) {
      await client.query(
        `INSERT INTO combo_items (combo_id, product_id, quantity, size_name, company_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [combo.id, item.product_id, item.quantity || 1, item.size_name || null, req.company_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, combo });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating combo:', error);
    res.status(500).json({ success: false, error: 'Failed to create combo' });
  } finally {
    client.release();
  }
});

// PUT update combo
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, description, price, image, active, items } = req.body;

    await client.query('BEGIN');

    const comboResult = await client.query(
      `UPDATE combos
       SET name = $1, description = $2, price = $3, image = $4, active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND company_id = $7 RETURNING *`,
      [name, description, price, image, active !== false, id, req.company_id]
    );

    if (comboResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Combo not found' });
    }

    // Update combo items if provided
    if (items && items.length > 0) {
      // Delete existing items
      await client.query('DELETE FROM combo_items WHERE combo_id = $1 AND company_id = $2', [id, req.company_id]);

      // Insert new items
      for (const item of items) {
        await client.query(
          `INSERT INTO combo_items (combo_id, product_id, quantity, size_name, company_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.product_id, item.quantity || 1, item.size_name || null, req.company_id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ success: true, combo: comboResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating combo:', error);
    res.status(500).json({ success: false, error: 'Failed to update combo' });
  } finally {
    client.release();
  }
});

// DELETE combo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM combos WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, req.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combo not found' });
    }

    res.json({ success: true, message: 'Combo deleted' });
  } catch (error) {
    console.error('Error deleting combo:', error);
    res.status(500).json({ success: false, error: 'Failed to delete combo' });
  }
});

export default router;
