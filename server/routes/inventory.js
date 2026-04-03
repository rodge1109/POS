import express from 'express';
import pool from '../config/database.js';

const router = express.Router();
const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// ============== INGREDIENTS MANAGEMENT ==============

// GET all ingredients
router.get('/ingredients', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM ingredients
      WHERE company_id = $1
      ORDER BY name ASC
    `, [req.company_id]);
    res.json({ success: true, ingredients: result.rows });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ingredients' });
  }
});

// GET ingredients with low stock
router.get('/ingredients/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM ingredients
      WHERE current_stock <= reorder_level AND company_id = $1
      ORDER BY current_stock ASC
    `, [req.company_id]);
    res.json({ success: true, ingredients: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching low stock ingredients:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch low stock items' });
  }
});

// GET single ingredient
router.get('/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE id = $1 AND company_id = $2',
      [id, req.company_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }
    res.json({ success: true, ingredient: result.rows[0] });
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ingredient' });
  }
});

// POST create ingredient
router.post('/ingredients', async (req, res) => {
  try {
    const { name, unit, current_stock = 0, reorder_level = 0, supplier, cost_per_unit = 0 } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ success: false, error: 'Name and unit are required' });
    }

    const result = await pool.query(
      `INSERT INTO ingredients (name, unit, current_stock, reorder_level, supplier, cost_per_unit, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, unit, current_stock, reorder_level, supplier || null, cost_per_unit, req.company_id]
    );

    res.json({ success: true, ingredient: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ success: false, error: 'Ingredient with this name already exists' });
    }
    console.error('Error creating ingredient:', error);
    res.status(500).json({ success: false, error: 'Failed to create ingredient' });
  }
});

// POST create packaged item (ingredient + recipe link)
router.post('/packaged', async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_id, name, unit = 'pc', current_stock = 0, reorder_level = 0, cost_per_unit = 0, quantity_required = 1 } = req.body;

    if (!product_id || !name) {
      return res.status(400).json({ success: false, error: 'product_id and name are required' });
    }

    await client.query('BEGIN');

    const ingResult = await client.query(
      `INSERT INTO ingredients (name, unit, current_stock, reorder_level, supplier, cost_per_unit, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, unit, current_stock, reorder_level, cost_per_unit`,
      [name, unit, current_stock, reorder_level, null, cost_per_unit, req.company_id]
    );
    const ingredient = ingResult.rows[0];

    // Link to recipe: packaged item consumes itself as a single ingredient unit
    await client.query(
      `INSERT INTO product_composition (product_id, ingredient_id, quantity_required, company_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [product_id, ingredient.id, quantity_required, req.company_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, ingredient });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating packaged item:', error);
    res.status(500).json({ success: false, error: 'Failed to create packaged item' });
  } finally {
    client.release();
  }
});

// GET CSV template for bulk ingredients
router.get('/ingredients/template', (req, res) => {
  const template = 'name,unit,current_stock,reorder_level,cost_per_unit,supplier\nSample Ingredient,pc,0,0,0,Supplier Name\n';
  res.header('Content-Type', 'text/csv');
  res.attachment('ingredients_template.csv');
  res.send(template);
});

// POST bulk upload ingredients via CSV
router.post('/ingredients/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ success: false, error: 'CSV content is required' });
    }

    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      return res.status(400).json({ success: false, error: 'No data rows found in CSV' });
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < 2) continue;
      const [name, unit, current_stock = 0, reorder_level = 0, cost_per_unit = 0, supplier = null] = parts;
      if (!name || !unit) continue;
      rows.push({
        name,
        unit,
        current_stock: parseFloat(current_stock) || 0,
        reorder_level: parseFloat(reorder_level) || 0,
        cost_per_unit: parseFloat(cost_per_unit) || 0,
        supplier: supplier || null
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid rows to import' });
    }

    await client.query('BEGIN');
    const inserted = [];
    for (const r of rows) {
      const result = await client.query(
        `INSERT INTO ingredients (name, unit, current_stock, reorder_level, supplier, cost_per_unit, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name, company_id) DO UPDATE SET
           unit = EXCLUDED.unit,
           reorder_level = EXCLUDED.reorder_level,
           cost_per_unit = EXCLUDED.cost_per_unit,
           supplier = EXCLUDED.supplier,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, unit, current_stock, reorder_level, cost_per_unit`,
        [r.name, r.unit, r.current_stock, r.reorder_level, r.supplier, r.cost_per_unit, req.company_id]
      );
      inserted.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.json({ success: true, imported: inserted.length, ingredients: inserted });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk uploading ingredients:', error);
    res.status(500).json({ success: false, error: 'Failed to import ingredients' });
  } finally {
    client.release();
  }
});

// PUT update ingredient
router.put('/ingredients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, reorder_level, supplier, cost_per_unit } = req.body;

    const result = await pool.query(
      `UPDATE ingredients
       SET name = COALESCE($1, name),
           unit = COALESCE($2, unit),
           reorder_level = COALESCE($3, reorder_level),
           supplier = COALESCE($4, supplier),
           cost_per_unit = COALESCE($5, cost_per_unit),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND company_id = $7 RETURNING *`,
      [name, unit, reorder_level, supplier, cost_per_unit, id, req.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }

    res.json({ success: true, ingredient: result.rows[0] });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ success: false, error: 'Failed to update ingredient' });
  }
});

// ============== INVENTORY TRANSACTIONS ==============

// POST add inventory transaction (manual adjustment)
router.post('/adjust', async (req, res) => {
  const client = await pool.connect();
  try {
    const { ingredient_id, quantity_change, notes, created_by = 'manual' } = req.body;

    if (!ingredient_id || quantity_change === undefined) {
      return res.status(400).json({ success: false, error: 'Ingredient ID and quantity change are required' });
    }

    await client.query('BEGIN');

    // Get current stock
    const ingredientResult = await client.query(
      'SELECT current_stock FROM ingredients WHERE id = $1 AND company_id = $2',
      [ingredient_id, req.company_id]
    );

    if (ingredientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }

    const newStock = Math.round((parseFloat(ingredientResult.rows[0].current_stock) + parseFloat(quantity_change)) * 100) / 100;

    if (newStock < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Insufficient stock' });
    }

    // Update ingredient stock
    await client.query(
      'UPDATE ingredients SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3',
      [newStock, ingredient_id, req.company_id]
    );

    // Record transaction
    const transactionResult = await client.query(
      `INSERT INTO inventory_transactions (ingredient_id, transaction_type, quantity_change, quantity_after, notes, created_by, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ingredient_id, 'adjustment', quantity_change, newStock, notes || null, created_by, req.company_id]
    );

    await client.query('COMMIT');
    res.json({ success: true, transaction: transactionResult.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust inventory' });
  } finally {
    client.release();
  }
});

// GET inventory transactions for an ingredient OR product
router.get('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'ingredient', limit = 100, offset = 0 } = req.query;
    const column = type === 'product' ? 'product_id' : 'ingredient_id';

    const result = await pool.query(
      `SELECT 
        it.*, 
        p.name as product_name, 
        ps.name as size_name
       FROM inventory_transactions it
       LEFT JOIN products p ON it.product_id = p.id AND it.company_id = p.company_id
       LEFT JOIN product_sizes ps ON it.size_id = ps.id AND it.company_id = ps.company_id
       WHERE it.${column} = $1 AND it.company_id = $2
       ORDER BY it.created_at DESC
       LIMIT $3 OFFSET $4`,
      [id, req.company_id, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM inventory_transactions WHERE ${column} = $1 AND company_id = $2`,
      [id, req.company_id]
    );

    res.json({
      success: true,
      transactions: result.rows,
      total: parseInt(countResult.rows[0].total)
    });
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// ============== PRODUCT COMPOSITION (RECIPES) ==============

// GET product recipe (ingredients needed)
router.get('/recipes/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT pc.id, pc.product_id, pc.ingredient_id, pc.quantity_required,
             i.name as ingredient_name, i.unit, i.current_stock
      FROM product_composition pc
      JOIN ingredients i ON pc.ingredient_id = i.id AND pc.company_id = i.company_id
      WHERE pc.product_id = $1 AND pc.company_id = $2
      ORDER BY i.name
    `, [productId, req.company_id]);
    res.json({ success: true, recipe: result.rows });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recipe' });
  }
});

// POST auto-link products and ingredients with matching names
router.post('/recipes/auto-link', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Find products and ingredients with identical names that aren't already linked
    const matches = await client.query(`
      SELECT p.id as product_id, i.id as ingredient_id, p.name
      FROM products p
      JOIN ingredients i ON LOWER(TRIM(p.name)) = LOWER(TRIM(i.name)) AND p.company_id = i.company_id
      LEFT JOIN product_composition pc ON p.id = pc.product_id AND i.id = pc.ingredient_id AND p.company_id = pc.company_id
      WHERE p.company_id = $1 AND pc.id IS NULL
    `, [req.company_id]);

    if (matches.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ success: true, message: 'No new matching products and ingredients found.', linked_count: 0 });
    }

    const linkedItems = [];
    for (const match of matches.rows) {
      const result = await client.query(
        `INSERT INTO product_composition (product_id, ingredient_id, quantity_required, company_id)
         VALUES ($1, $2, 1, $3)
         RETURNING *`,
        [match.product_id, match.ingredient_id, req.company_id]
      );
      linkedItems.push({ name: match.name, ...result.rows[0] });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Successfully auto-linked ${linkedItems.length} matching items.`, linked_count: linkedItems.length, items: linkedItems });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error auto-linking recipes:', error);
    res.status(500).json({ success: false, error: 'Failed to auto-link matching items' });
  } finally {
    client.release();
  }
});

// GET all products with their recipes
router.get('/recipes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT p.id, p.name, p.category, p.price,
        (SELECT COUNT(*) FROM product_composition WHERE product_id = p.id AND company_id = $1) as ingredient_count
      FROM products p
      LEFT JOIN product_composition pc ON p.id = pc.product_id AND p.company_id = pc.company_id
      WHERE p.company_id = $1
      ORDER BY p.name
    `, [req.company_id]);

    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recipes' });
  }
});

// GET specific product recipe
router.get('/recipes/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT 
        pc.id as composition_id,
        pc.ingredient_id,
        pc.quantity_required,
        pc.size_id,
        ps.name as size_name,
        i.name as ingredient_name,
        i.unit,
        i.current_stock,
        i.cost_per_unit
      FROM product_composition pc
      JOIN ingredients i ON pc.ingredient_id = i.id
      LEFT JOIN product_sizes ps ON pc.size_id = ps.id
      WHERE pc.product_id = $1 AND pc.company_id = $2
    `, [productId, req.company_id]);
    res.json({ success: true, recipe: result.rows });
  } catch (error) {
    console.error('Error fetching product recipe:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST add ingredient to recipe
router.post('/recipes/:productId/ingredients', async (req, res) => {
  try {
    const { productId } = req.params;
    const { ingredient_id, quantity_required, size_id } = req.body;

    if (!ingredient_id || !quantity_required) {
      return res.status(400).json({ success: false, error: 'Ingredient ID and quantity are required' });
    }

    const productResult = await pool.query('SELECT id FROM products WHERE id = $1 AND company_id = $2', [productId, req.company_id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Check if link already exists for this size
    const existing = await pool.query(
      'SELECT id FROM product_composition WHERE product_id = $1 AND ingredient_id = $2 AND (size_id = $3 OR (size_id IS NULL AND $3 IS NULL)) AND company_id = $4',
      [productId, ingredient_id, size_id || null, req.company_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'This ingredient is already linked to this product size' });
    }

    const result = await pool.query(
      `INSERT INTO product_composition (product_id, ingredient_id, quantity_required, size_id, company_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [productId, ingredient_id, quantity_required, size_id || null, req.company_id]
    );
    res.json({ success: true, composition: result.rows[0] });
  } catch (error) {
    console.error('Error adding recipe ingredient:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT update recipe ingredient
router.put('/recipes/:productId/ingredients/:ingredientId', async (req, res) => {
  try {
    const { productId, ingredientId } = req.params;
    const { quantity_required, size_id } = req.body;
    
    const result = await pool.query(
      `UPDATE product_composition 
       SET quantity_required = $1, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $2 AND ingredient_id = $3 AND (size_id = $4 OR (size_id IS NULL AND $4 IS NULL)) AND company_id = $5
       RETURNING *`,
      [quantity_required, productId, ingredientId, size_id || null, req.company_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe item not found' });
    }
    res.json({ success: true, composition: result.rows[0] });
  } catch (error) {
    console.error('Error updating recipe ingredient:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE recipe ingredient
router.delete('/recipes/:productId/ingredients/:ingredientId', async (req, res) => {
  try {
    const { productId, ingredientId } = req.params;
    const { size_id } = req.query; // Optional size filter

    let query = 'DELETE FROM product_composition WHERE product_id = $1 AND ingredient_id = $2 AND company_id = $3';
    let params = [productId, ingredientId, req.company_id];

    if (size_id) {
      query += ' AND (size_id = $4 OR (size_id IS NULL AND $4 IS NULL))';
      params.push(size_id);
    } else {
      query += ' AND size_id IS NULL';
    }

    const result = await pool.query(query, params);
    res.json({ success: true, message: 'Ingredient removed from recipe' });
  } catch (error) {
    console.error('Error deleting recipe ingredient:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============== INVENTORY STATUS ==============

// GET inventory status (all ingredients with stock levels)
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        *,
        CASE 
          WHEN current_stock <= reorder_level THEN 'low'
          WHEN current_stock > (reorder_level * 2) THEN 'high'
          ELSE 'normal'
        END as stock_status,
        (current_stock * cost_per_unit) as stock_value
      FROM ingredients
      WHERE company_id = $1
      ORDER BY stock_status DESC, name ASC
    `, [req.company_id]);

    const lowStockCount = result.rows.filter(i => i.stock_status === 'low').length;
    const totalValue = result.rows.reduce((sum, i) => sum + toNum(i.stock_value), 0);

    res.json({
      success: true,
      inventory: result.rows,
      summary: {
        total_items: result.rows.length,
        low_stock_count: lowStockCount,
        total_inventory_value: parseFloat(totalValue.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory status' });
  }
});

// GET inventory analytics
router.get('/analytics', async (req, res) => {
  try {
    const topUsed = await pool.query(`
      SELECT i.name, i.unit, COUNT(it.id) as usage_count
      FROM ingredients i
      LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id AND i.company_id = it.company_id
      WHERE it.transaction_type = 'order_deduction' AND i.company_id = $1
      GROUP BY i.id, i.name, i.unit
      ORDER BY usage_count DESC
      LIMIT 10
    `, [req.company_id]);

    const costDistribution = await pool.query(`
      SELECT name, (current_stock * cost_per_unit) as stock_value
      FROM ingredients
      WHERE current_stock > 0 AND company_id = $1
      ORDER BY stock_value DESC
      LIMIT 10
    `, [req.company_id]);

    res.json({
      success: true,
      topUsedIngredients: topUsed.rows,
      costDistribution: costDistribution.rows
    });
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// ============== INVENTORY REPORTS ==============

// GET Stock Status Report
router.get('/reports/stock-status', async (req, res) => {
  try {
    const { type = 'ingredient' } = req.query;
    let query;
    let params = [req.company_id];

    if (type === 'product') {
      query = `
        SELECT 
          id, name, category as unit, stock_quantity as current_stock, low_stock_threshold as reorder_level, 
          'Retail' as supplier, price as cost_per_unit,
          (stock_quantity * COALESCE(cost, 0)) as stock_value,
          CASE 
            WHEN stock_quantity <= low_stock_threshold THEN 'Critical'
            WHEN stock_quantity <= (low_stock_threshold * 1.5) THEN 'Low'
            WHEN stock_quantity > (low_stock_threshold * 3) THEN 'High'
            ELSE 'Normal'
          END as status,
          ROUND(((stock_quantity - low_stock_threshold) / GREATEST(low_stock_threshold, 1) * 100)::numeric, 2) as stock_level_percentage,
          CASE
            WHEN stock_quantity <= low_stock_threshold THEN (low_stock_threshold * 2 - stock_quantity)
            ELSE 0
          END as suggested_reorder_qty,
          created_at, updated_at
        FROM products
        WHERE company_id = $1
        ORDER BY 
          CASE 
            WHEN stock_quantity <= low_stock_threshold THEN 1
            WHEN stock_quantity <= (low_stock_threshold * 1.5) THEN 2
            ELSE 3
          END,
          stock_value DESC`;
    } else {
      query = `
        SELECT 
          id, name, unit, current_stock, reorder_level, supplier, cost_per_unit,
          (current_stock * cost_per_unit) as stock_value,
          CASE 
            WHEN current_stock <= reorder_level THEN 'Critical'
            WHEN current_stock <= (reorder_level * 1.5) THEN 'Low'
            WHEN current_stock > (reorder_level * 3) THEN 'High'
            ELSE 'Normal'
          END as status,
          ROUND(((current_stock - reorder_level) / GREATEST(reorder_level, 1) * 100)::numeric, 2) as stock_level_percentage,
          CASE
            WHEN current_stock <= reorder_level THEN (reorder_level * 2 - current_stock)
            ELSE 0
          END as suggested_reorder_qty,
          created_at, updated_at
        FROM ingredients
        WHERE company_id = $1
        ORDER BY 
          CASE 
            WHEN current_stock <= reorder_level THEN 1
            WHEN current_stock <= (reorder_level * 1.5) THEN 2
            ELSE 3
          END,
          stock_value DESC`;
    }

    const result = await pool.query(query, params);
    const totalValue = result.rows.reduce((sum, item) => sum + toNum(item.stock_value), 0);
    const criticalCount = result.rows.filter(i => i.status === 'Critical').length;
    const lowCount = result.rows.filter(i => i.status === 'Low').length;

    res.json({
      success: true,
      report: {
        title: `${type === 'product' ? 'Product' : 'Ingredient'} Stock Status Report`,
        generated_at: new Date().toISOString(),
        summary: {
          total_items: result.rows.length,
          critical_items: criticalCount,
          low_stock_items: lowCount,
          total_inventory_value: parseFloat(totalValue.toFixed(2)),
          average_item_value: result.rows.length > 0 ? parseFloat((totalValue / result.rows.length).toFixed(2)) : 0
        },
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching stock status report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stock status report' });
  }
});

// GET Inventory Movement Report
router.get('/reports/movement', async (req, res) => {
  try {
    const { days = 30, type = 'ingredient' } = req.query;
    let query;
    const params = [req.company_id, parseInt(days)];

    if (type === 'product') {
      query = `
        SELECT 
          p.name, p.category as unit,
          SUM(CASE WHEN t.quantity_change > 0 THEN t.quantity_change ELSE 0 END) as inward,
          ABS(SUM(CASE WHEN t.quantity_change < 0 THEN t.quantity_change ELSE 0 END)) as outward,
          p.stock_quantity as current_stock,
          ABS(SUM(CASE WHEN t.transaction_type = 'product_deduction' THEN t.quantity_change ELSE 0 END)) as sales_deduction,
          SUM(CASE WHEN t.transaction_type = 'manual_adjustment' AND t.quantity_change > 0 THEN t.quantity_change ELSE 0 END) as manual_additions
        FROM products p
        LEFT JOIN inventory_transactions t ON p.id = t.product_id 
          AND t.created_at >= CURRENT_DATE - ($2 || ' days')::interval
          AND t.company_id = $1
        WHERE p.company_id = $1
        GROUP BY p.id, p.name, p.category, p.stock_quantity
        ORDER BY outward DESC`;
    } else {
      query = `
        SELECT 
          i.name, i.unit,
          SUM(CASE WHEN t.quantity_change > 0 THEN t.quantity_change ELSE 0 END) as inward,
          ABS(SUM(CASE WHEN t.quantity_change < 0 THEN t.quantity_change ELSE 0 END)) as outward,
          i.current_stock,
          ABS(SUM(CASE WHEN t.transaction_type = 'order_deduction' THEN t.quantity_change ELSE 0 END)) as order_usage,
          SUM(CASE WHEN t.transaction_type = 'adjustment' AND t.quantity_change > 0 THEN t.quantity_change ELSE 0 END) as manuals_received
        FROM ingredients i
        LEFT JOIN inventory_transactions t ON i.id = t.ingredient_id 
          AND t.created_at >= CURRENT_DATE - ($2 || ' days')::interval
          AND t.company_id = $1
        WHERE i.company_id = $1
        GROUP BY i.id, i.name, i.unit, i.current_stock
        ORDER BY outward DESC`;
    }

    const result = await pool.query(query, params);
    
    const totalInward = result.rows.reduce((sum, item) => sum + toNum(item.inward), 0);
    const totalOutward = result.rows.reduce((sum, item) => sum + toNum(item.outward), 0);

    res.json({
      success: true,
      report: {
        title: `${type === 'product' ? 'Product' : 'Ingredient'} Movement Report (Last ${days} days)`,
        generated_at: new Date().toISOString(),
        summary: {
          period_days: parseInt(days),
          total_items_moved: result.rows.length,
          total_inward_volume: totalInward,
          total_outward_volume: totalOutward,
          net_movement: totalInward - totalOutward
        },
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching inventory movement report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory movement report' });
  }
});

// GET Stock Valuation Report
router.get('/reports/valuation', async (req, res) => {
  try {
    const { type = 'ingredient' } = req.query;
    let query;
    if (type === 'product') {
      query = `SELECT name, stock_quantity as current_stock, cost as cost_per_unit, (stock_quantity * COALESCE(cost,0)) as stock_value,
               ROUND((stock_quantity * COALESCE(cost,0) / NULLIF(SUM(stock_quantity * COALESCE(cost,0)) OVER (), 0) * 100)::numeric, 2) as percentage_of_total
               FROM products WHERE stock_quantity > 0 AND company_id = $1 ORDER BY stock_value DESC`;
    } else {
      query = `SELECT name, current_stock, cost_per_unit, (current_stock * cost_per_unit) as stock_value,
               ROUND((current_stock * cost_per_unit / NULLIF(SUM(current_stock * cost_per_unit) OVER (), 0) * 100)::numeric, 2) as percentage_of_total
               FROM ingredients WHERE current_stock > 0 AND company_id = $1 ORDER BY stock_value DESC`;
    }
    const result = await pool.query(query, [req.company_id]);
    const totalValue = result.rows.reduce((sum, item) => sum + toNum(item.stock_value), 0);
    res.json({
      success: true,
      report: {
        title: `${type === 'product' ? 'Product' : 'Ingredient'} Stock Valuation Report`,
        generated_at: new Date().toISOString(),
        summary: { total_items: result.rows.length, total_inventory_value: parseFloat(totalValue.toFixed(2)) },
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching valuation report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch valuation report' });
  }
});

// GET ABC Analysis Report
router.get('/reports/abc-analysis', async (req, res) => {
  try {
    const { type = 'ingredient' } = req.query;
    let query;
    if (type === 'product') {
      query = `
        SELECT 
          p.name, p.category as unit, p.stock_quantity as current_stock, p.price as cost_per_unit,
          (p.stock_quantity * COALESCE(p.cost, 0)) as stock_value,
          COUNT(it.id) as usage_frequency
        FROM products p
        LEFT JOIN inventory_transactions it ON p.id = it.product_id AND p.company_id = it.company_id AND it.transaction_type = 'product_deduction'
        WHERE p.company_id = $1
        GROUP BY p.id, p.name, p.category, p.stock_quantity, p.price, p.cost
        ORDER BY stock_value DESC`;
    } else {
      query = `
        SELECT 
          name, unit, current_stock, cost_per_unit,
          (current_stock * cost_per_unit) as stock_value,
          COUNT(it.id) as usage_frequency
        FROM ingredients i
        LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id AND i.company_id = it.company_id AND it.transaction_type = 'order_deduction'
        WHERE i.company_id = $1
        GROUP BY i.id, i.name, i.unit, i.current_stock, i.cost_per_unit
        ORDER BY stock_value DESC`;
    }
    const result = await pool.query(query, [req.company_id]);

    const totalValue = result.rows.reduce((sum, item) => sum + toNum(item.stock_value), 0);
    let cumulativeValue = 0;
    
    const classified = result.rows.map((item) => {
      cumulativeValue += toNum(item.stock_value);
      const percentage = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0;
      
      let classification = 'C';
      if (percentage <= 80 && item.usage_frequency > 0) classification = 'A';
      else if (percentage <= 95 && item.usage_frequency > 0) classification = 'B';
      
      return {
        ...item,
        cumulative_percentage: parseFloat(percentage.toFixed(2)),
        classification,
        value_percentage: totalValue > 0 ? parseFloat(((toNum(item.stock_value) / totalValue) * 100).toFixed(2)) : 0
      };
    });

    res.json({
      success: true,
      report: {
        title: `ABC Analysis (${type === 'product' ? 'Products' : 'Ingredients'}) Report`,
        generated_at: new Date().toISOString(),
        summary: {
          total_items: result.rows.length,
          total_value: parseFloat(totalValue.toFixed(2))
        },
        data: classified
      }
    });
  } catch (error) {
    console.error('Error fetching ABC analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ABC analysis' });
  }
});

// GET Turnover Report
router.get('/reports/turnover', async (req, res) => {
  try {
    const { days = 30, type = 'ingredient' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    let query;

    if (type === 'product') {
      query = `
        SELECT 
          p.id, p.name, p.category as unit, p.stock_quantity as current_stock, p.price as cost_per_unit,
          (p.stock_quantity * COALESCE(p.cost, 0)) as current_value,
          SUM(CASE WHEN it.transaction_type = 'product_deduction' THEN ABS(it.quantity_change) ELSE 0 END) as total_used,
          COUNT(CASE WHEN it.transaction_type = 'product_deduction' THEN 1 END) as usage_count,
          CASE
            WHEN p.stock_quantity > 0 THEN ROUND((SUM(CASE WHEN it.transaction_type = 'product_deduction' THEN ABS(it.quantity_change) ELSE 0 END) / p.stock_quantity)::numeric, 2)
            ELSE 0
          END as turnover_ratio,
          CASE
            WHEN p.stock_quantity > 0 AND SUM(CASE WHEN it.transaction_type = 'product_deduction' THEN ABS(it.quantity_change) ELSE 0 END) > 0 
            THEN ROUND((p.stock_quantity / (SUM(CASE WHEN it.transaction_type = 'product_deduction' THEN ABS(it.quantity_change) ELSE 0 END) / $2))::numeric, 2)
            ELSE NULL
          END as days_on_hand
        FROM products p
        LEFT JOIN inventory_transactions it ON p.id = it.product_id AND p.company_id = it.company_id AND it.created_at >= $1
        WHERE p.company_id = $3
        GROUP BY p.id, p.name, p.category, p.stock_quantity, p.price, p.cost
        ORDER BY total_used DESC NULLS LAST`;
    } else {
      query = `
        SELECT 
          i.id, i.name, i.unit, i.current_stock, i.cost_per_unit,
          (i.current_stock * i.cost_per_unit) as current_value,
          SUM(CASE WHEN it.transaction_type = 'order_deduction' THEN ABS(it.quantity_change) ELSE 0 END) as total_used,
          COUNT(CASE WHEN it.transaction_type = 'order_deduction' THEN 1 END) as usage_count,
          CASE
            WHEN i.current_stock > 0 THEN ROUND((SUM(CASE WHEN it.transaction_type = 'order_deduction' THEN ABS(it.quantity_change) ELSE 0 END) / i.current_stock)::numeric, 2)
            ELSE 0
          END as turnover_ratio,
          CASE
            WHEN i.current_stock > 0 AND SUM(CASE WHEN it.transaction_type = 'order_deduction' THEN ABS(it.quantity_change) ELSE 0 END) > 0 
            THEN ROUND((i.current_stock / (SUM(CASE WHEN it.transaction_type = 'order_deduction' THEN ABS(it.quantity_change) ELSE 0 END) / $2))::numeric, 2)
            ELSE NULL
          END as days_on_hand
        FROM ingredients i
        LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id AND i.company_id = it.company_id AND it.created_at >= $1
        WHERE i.company_id = $3
        GROUP BY i.id, i.name, i.unit, i.current_stock, i.cost_per_unit
        ORDER BY total_used DESC NULLS LAST`;
    }

    const result = await pool.query(query, [startDate, parseInt(days), req.company_id]);

    res.json({
      success: true,
      report: {
        title: `${type === 'product' ? 'Product' : 'Ingredient'} Turnover Report`,
        period_days: parseInt(days),
        generated_at: new Date().toISOString(),
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching turnover report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch turnover report' });
  }
});

// GET receive history
router.get('/receive/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT it.id, it.quantity_change, it.notes, it.created_at, i.name as ingredient_name, i.unit
      FROM inventory_transactions it
      JOIN ingredients i ON it.ingredient_id = i.id AND it.company_id = i.company_id
      WHERE it.quantity_change > 0 AND it.company_id = $1
      ORDER BY it.created_at DESC
      LIMIT 50
    `, [req.company_id]);
    res.json({ success: true, history: result.rows });
  } catch (error) {
    console.error('Error fetching receive history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

export default router;
