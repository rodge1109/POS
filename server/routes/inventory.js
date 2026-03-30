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

// POST bulk upload ingredients via CSV (simple comma-separated, no quoted fields)
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
    // skip header
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
  try {
    const { ingredient_id, quantity_change, notes, created_by = 'manual' } = req.body;

    if (!ingredient_id || quantity_change === undefined) {
      return res.status(400).json({ success: false, error: 'Ingredient ID and quantity change are required' });
    }

    const client = await pool.connect();
    try {
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

      console.log(`Updated ingredient ${ingredient_id}: old stock + ${quantity_change} = ${newStock}`);
     

// Record transaction
    const transactionResult = await client.query(
      `INSERT INTO inventory_transactions (ingredient_id, transaction_type, quantity_change, quantity_after, notes, created_by, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ingredient_id, 'adjustment', quantity_change, newStock, notes || null, created_by, req.company_id]
    );

      await client.query('COMMIT');
      res.json({ success: true, transaction: transactionResult.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust inventory' });
  }
});

// GET inventory transactions for an ingredient
router.get('/transactions/:ingredientId', async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM inventory_transactions
       WHERE ingredient_id = $1 AND company_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [ingredientId, req.company_id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM inventory_transactions WHERE ingredient_id = $1 AND company_id = $2',
      [ingredientId, req.company_id]
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

// GET all products with their recipes
router.get('/recipes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT p.id, p.name, p.category,
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

// POST add ingredient to recipe
router.post('/recipes/:productId/ingredients', async (req, res) => {
  try {
    const { productId } = req.params;
    const { ingredient_id, quantity_required } = req.body;

    if (!ingredient_id || !quantity_required) {
      return res.status(400).json({ success: false, error: 'Ingredient ID and quantity are required' });
    }

    // Check if product exists
    const productResult = await pool.query('SELECT id FROM products WHERE id = $1 AND company_id = $2', [productId, req.company_id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if ingredient exists
    const ingredientResult = await pool.query('SELECT id FROM ingredients WHERE id = $1 AND company_id = $2', [ingredient_id, req.company_id]);
    if (ingredientResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Ingredient not found' });
    }

    const result = await pool.query(
      `INSERT INTO product_composition (product_id, ingredient_id, quantity_required, company_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, product_id, ingredient_id) DO UPDATE
       SET quantity_required = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [productId, ingredient_id, quantity_required, req.company_id]
    );

    res.json({ success: true, composition: result.rows[0] });
  } catch (error) {
    console.error('Error adding ingredient to recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to add ingredient to recipe' });
  }
});

// PUT update ingredient quantity in recipe
router.put('/recipes/:productId/ingredients/:ingredientId', async (req, res) => {
  try {
    const { productId, ingredientId } = req.params;
    const { quantity_required } = req.body;

    if (!quantity_required) {
      return res.status(400).json({ success: false, error: 'Quantity is required' });
    }

    const result = await pool.query(
      `UPDATE product_composition
       SET quantity_required = $1, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $2 AND ingredient_id = $3 AND company_id = $4
       RETURNING *`,
      [parseFloat(quantity_required), productId, ingredientId, req.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe ingredient not found' });
    }

    res.json({ success: true, composition: result.rows[0] });
  } catch (error) {
    console.error('Error updating recipe ingredient:', error);
    res.status(500).json({ success: false, error: 'Failed to update recipe ingredient' });
  }
});

// DELETE ingredient from recipe
router.delete('/recipes/:productId/ingredients/:ingredientId', async (req, res) => {
  try {
    const { productId, ingredientId } = req.params;

    const result = await pool.query(
      'DELETE FROM product_composition WHERE product_id = $1 AND ingredient_id = $2 AND company_id = $3 RETURNING *',
      [productId, ingredientId, req.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recipe ingredient not found' });
    }

    res.json({ success: true, message: 'Ingredient removed from recipe' });
  } catch (error) {
    console.error('Error removing ingredient from recipe:', error);
    res.status(500).json({ success: false, error: 'Failed to remove ingredient from recipe' });
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

    // Calculate summary stats
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
    // Top 10 most used ingredients
    const topUsed = await pool.query(`
      SELECT i.name, i.unit, COUNT(it.id) as usage_count
      FROM ingredients i
      LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id AND i.company_id = it.company_id
      WHERE it.transaction_type = 'order_deduction' AND i.company_id = $1
      GROUP BY i.id, i.name, i.unit
      ORDER BY usage_count DESC
      LIMIT 10
    `, [req.company_id]);

    // Inventory cost distribution
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

// GET Stock Status Report (Current inventory levels)
router.get('/reports/stock-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        unit,
        current_stock,
        reorder_level,
        supplier,
        cost_per_unit,
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
        created_at,
        updated_at
      FROM ingredients
      WHERE company_id = $1
      ORDER BY 
        CASE 
          WHEN current_stock <= reorder_level THEN 1
          WHEN current_stock <= (reorder_level * 1.5) THEN 2
          ELSE 3
        END,
        stock_value DESC
    `, [req.company_id]);

    const totalValue = result.rows.reduce((sum, item) => sum + toNum(item.stock_value), 0);
    const criticalCount = result.rows.filter(i => i.status === 'Critical').length;
    const lowCount = result.rows.filter(i => i.status === 'Low').length;

    res.json({
      success: true,
      report: {
        title: 'Stock Status Report',
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

// GET Inventory Movement Report (Usage trends)
router.get('/reports/movement', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const result = await pool.query(`
      SELECT 
        i.id,
        i.name,
        i.unit,
        COUNT(CASE WHEN it.transaction_type = 'order_deduction' THEN 1 END) as usage_count,
        SUM(CASE WHEN it.transaction_type = 'order_deduction' THEN ABS(it.quantity_change) ELSE 0 END) as total_used,
        SUM(CASE WHEN it.transaction_type = 'purchase' THEN it.quantity_change ELSE 0 END) as total_received,
        SUM(CASE WHEN it.transaction_type = 'adjustment' THEN it.quantity_change ELSE 0 END) as total_adjustments,
        i.current_stock,
        (i.current_stock * i.cost_per_unit) as current_value,
        ROUND((SUM(CASE WHEN it.transaction_type = 'order_deduction' THEN ABS(it.quantity_change) ELSE 0 END) / GREATEST(COUNT(CASE WHEN it.transaction_type = 'order_deduction' THEN 1 END), 1))::numeric, 2) as avg_usage_per_transaction
      FROM ingredients i
      LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id AND i.company_id = it.company_id AND it.created_at >= $1
      WHERE i.company_id = $2
      GROUP BY i.id, i.name, i.unit, i.current_stock, i.cost_per_unit
      ORDER BY total_used DESC NULLS LAST
    `, [startDate, req.company_id]);

    const avgUsage = result.rows.filter(r => r.total_used).reduce((sum, r) => sum + (r.total_used || 0), 0) / result.rows.length;

    res.json({
      success: true,
      report: {
        title: 'Inventory Movement Report',
        period_days: parseInt(days),
        generated_at: new Date().toISOString(),
        summary: {
          total_items_tracked: result.rows.length,
          items_with_movement: result.rows.filter(r => r.usage_count > 0).length,
          average_usage: parseFloat(avgUsage.toFixed(2))
        },
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching movement report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch movement report' });
  }
});

// GET Stock Valuation Report
router.get('/reports/valuation', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        name,
        current_stock,
        cost_per_unit,
        (current_stock * cost_per_unit) as stock_value,
        ROUND((current_stock * cost_per_unit / SUM(current_stock * cost_per_unit) OVER () * 100)::numeric, 2) as percentage_of_total
      FROM ingredients
      WHERE current_stock > 0 AND company_id = $1
      ORDER BY stock_value DESC
    `, [req.company_id]);

    const totalValue = result.rows.reduce((sum, item) => sum + toNum(item.stock_value), 0);
    const categoryValue = {};
    
    result.rows.forEach(item => {
      const category = item.percentage_of_total >= 20 ? 'High Value' : item.percentage_of_total >= 5 ? 'Medium Value' : 'Low Value';
      if (!categoryValue[category]) categoryValue[category] = 0;
      categoryValue[category] += toNum(item.stock_value);
    });

    res.json({
      success: true,
      report: {
        title: 'Stock Valuation Report',
        generated_at: new Date().toISOString(),
        summary: {
          total_items: result.rows.length,
          total_inventory_value: parseFloat(totalValue.toFixed(2)),
          high_value_items: result.rows.filter(i => i.percentage_of_total >= 20).length,
          medium_value_items: result.rows.filter(i => i.percentage_of_total >= 5 && i.percentage_of_total < 20).length,
          low_value_items: result.rows.filter(i => i.percentage_of_total < 5).length,
          value_distribution: categoryValue
        },
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching valuation report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch valuation report' });
  }
});

// GET ABC Analysis Report (Pareto analysis)
router.get('/reports/abc-analysis', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        name,
        unit,
        current_stock,
        cost_per_unit,
        (current_stock * cost_per_unit) as stock_value,
        COUNT(it.id) as usage_frequency
      FROM ingredients i
      LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id AND i.company_id = it.company_id AND it.transaction_type = 'order_deduction'
      WHERE i.company_id = $1
      GROUP BY i.id, i.name, i.unit, i.current_stock, i.cost_per_unit
      ORDER BY stock_value DESC
    `, [req.company_id]);

    const totalValue = result.rows.reduce((sum, item) => sum + toNum(item.stock_value), 0);
    let cumulativeValue = 0;
    
    const classified = result.rows.map((item, idx) => {
      const itemValue = toNum(item.stock_value);
      cumulativeValue += itemValue;
      const percentage = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0;
      
      let classification = 'C'; // Low value, low frequency
      if (percentage <= 80 && item.usage_frequency > 0) {
        classification = 'A'; // High value, high frequency (80% of value)
      } else if (percentage <= 95 && item.usage_frequency > 0) {
        classification = 'B'; // Medium value, medium frequency (80-95% of value)
      }
      
      return {
        ...item,
        cumulative_percentage: parseFloat(percentage.toFixed(2)),
        classification,
        value_percentage: totalValue > 0 ? parseFloat(((itemValue / totalValue) * 100).toFixed(2)) : 0
      };
    });

    const countA = classified.filter(i => i.classification === 'A').length;
    const countB = classified.filter(i => i.classification === 'B').length;
    const countC = classified.filter(i => i.classification === 'C').length;
    
    const valueA = classified.filter(i => i.classification === 'A').reduce((sum, i) => sum + toNum(i.stock_value), 0);
    const valueB = classified.filter(i => i.classification === 'B').reduce((sum, i) => sum + toNum(i.stock_value), 0);
    const valueC = classified.filter(i => i.classification === 'C').reduce((sum, i) => sum + toNum(i.stock_value), 0);

    res.json({
      success: true,
      report: {
        title: 'ABC Analysis Report (Pareto - 80/20 Rule)',
        generated_at: new Date().toISOString(),
        summary: {
          total_items: result.rows.length,
          classification_a: { count: countA, value: parseFloat(valueA.toFixed(2)), percentage: totalValue > 0 ? parseFloat((valueA / totalValue * 100).toFixed(2)) : 0 },
          classification_b: { count: countB, value: parseFloat(valueB.toFixed(2)), percentage: totalValue > 0 ? parseFloat((valueB / totalValue * 100).toFixed(2)) : 0 },
          classification_c: { count: countC, value: parseFloat(valueC.toFixed(2)), percentage: totalValue > 0 ? parseFloat((valueC / totalValue * 100).toFixed(2)) : 0 },
          total_value: parseFloat(totalValue.toFixed(2))
        },
        classification_guide: {
          A: 'High-value items (require frequent monitoring)',
          B: 'Medium-value items (moderate monitoring)',
          C: 'Low-value items (basic monitoring)'
        },
        data: classified
      }
    });
  } catch (error) {
    console.error('Error fetching ABC analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ABC analysis' });
  }
});

// GET Reorder Point Report
router.get('/reports/reorder-analysis', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        unit,
        current_stock,
        reorder_level,
        supplier,
        cost_per_unit,
        (current_stock * cost_per_unit) as current_value,
        (reorder_level * cost_per_unit) as reorder_value,
        CASE
          WHEN current_stock <= reorder_level THEN (reorder_level * 1.5 - current_stock)
          WHEN current_stock <= (reorder_level * 1.5) THEN (reorder_level * 2 - current_stock)
          ELSE 0
        END as recommended_order_qty,
        CASE
          WHEN current_stock <= reorder_level THEN 'URGENT'
          WHEN current_stock <= (reorder_level * 1.5) THEN 'SOON'
          ELSE 'OK'
        END as reorder_status
      FROM ingredients
      WHERE company_id = $1
      ORDER BY 
        CASE
          WHEN current_stock <= reorder_level THEN 1
          WHEN current_stock <= (reorder_level * 1.5) THEN 2
          ELSE 3
        END,
        current_stock ASC
    `, [req.company_id]);

    const urgent = result.rows.filter(i => i.reorder_status === 'URGENT');
    const soon = result.rows.filter(i => i.reorder_status === 'SOON');
    const totalOrderValue = result.rows.reduce((sum, i) => sum + (toNum(i.recommended_order_qty) * toNum(i.cost_per_unit)), 0);

    res.json({
      success: true,
      report: {
        title: 'Reorder Point Analysis',
        generated_at: new Date().toISOString(),
        summary: {
          total_items: result.rows.length,
          urgent_orders: urgent.length,
          soon_to_order: soon.length,
          estimated_order_value: parseFloat(totalOrderValue.toFixed(2))
        },
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching reorder analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reorder analysis' });
  }
});

// GET Waste/Shrinkage Report
router.get('/reports/waste-shrinkage', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const result = await pool.query(`
      SELECT 
        i.id,
        i.name,
        i.unit,
        SUM(CASE WHEN it.transaction_type = 'adjustment' AND it.quantity_change < 0 THEN ABS(it.quantity_change) ELSE 0 END) as waste_qty,
        SUM(CASE WHEN it.transaction_type = 'adjustment' AND it.quantity_change < 0 THEN ABS(it.quantity_change) * i.cost_per_unit ELSE 0 END) as waste_value,
        COUNT(CASE WHEN it.transaction_type = 'adjustment' AND it.quantity_change < 0 THEN 1 END) as waste_transactions,
        i.current_stock,
        (i.current_stock * i.cost_per_unit) as current_value,
        ROUND((SUM(CASE WHEN it.transaction_type = 'adjustment' AND it.quantity_change < 0 THEN ABS(it.quantity_change) ELSE 0 END) / GREATEST(SUM(CASE WHEN it.transaction_type = 'purchase' THEN it.quantity_change ELSE 0 END), 1) * 100)::numeric, 2) as waste_percentage
      FROM ingredients i
      LEFT JOIN inventory_transactions it ON i.id = it.ingredient_id AND i.company_id = it.company_id AND it.created_at >= $1
      WHERE i.company_id = $2
      GROUP BY i.id, i.name, i.unit, i.current_stock, i.cost_per_unit
      HAVING SUM(CASE WHEN it.transaction_type = 'adjustment' AND it.quantity_change < 0 THEN ABS(it.quantity_change) ELSE 0 END) > 0
      ORDER BY waste_value DESC NULLS LAST
    `, [startDate, req.company_id]);

    const totalWaste = result.rows.reduce((sum, item) => sum + toNum(item.waste_value), 0);
    const totalTransactions = result.rows.reduce((sum, item) => sum + toNum(item.waste_transactions), 0);

    res.json({
      success: true,
      report: {
        title: 'Waste & Shrinkage Report',
        period_days: parseInt(days),
        generated_at: new Date().toISOString(),
        summary: {
          items_with_waste: result.rows.length,
          total_waste_value: parseFloat(totalWaste.toFixed(2)),
          total_waste_transactions: totalTransactions,
          average_waste_per_item: result.rows.length > 0 ? parseFloat((totalWaste / result.rows.length).toFixed(2)) : 0
        },
        data: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching waste report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch waste report' });
  }
});

// GET Inventory Turnover Report
router.get('/reports/turnover', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const result = await pool.query(`
      SELECT 
        i.id,
        i.name,
        i.unit,
        i.current_stock,
        i.cost_per_unit,
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
      ORDER BY total_used DESC NULLS LAST
    `, [startDate, parseInt(days), req.company_id]);

    const fastMoving = result.rows.filter(i => (toNum(i.days_on_hand) || 999) <= 7).length;
    const slowMoving = result.rows.filter(i => (toNum(i.days_on_hand) || 999) > 30).length;
    const avgTurnover = result.rows.length > 0
      ? result.rows.reduce((sum, i) => sum + toNum(i.turnover_ratio), 0) / result.rows.length
      : 0;

    res.json({
      success: true,
      report: {
        title: 'Inventory Turnover Report',
        period_days: parseInt(days),
        generated_at: new Date().toISOString(),
        summary: {
          total_items: result.rows.length,
          fast_moving_items: fastMoving,
          slow_moving_items: slowMoving,
          average_turnover_ratio: parseFloat(avgTurnover.toFixed(2)),
          items_with_no_movement: result.rows.filter(i => !i.usage_count).length
        },
        turnover_guide: {
          'High (>5)': 'Fast-moving, reorder frequently',
          'Medium (2-5)': 'Steady demand',
          'Low (<2)': 'Slow-moving, monitor for obsolescence',
          'None (0)': 'No recent usage, consider discontinuing'
        },
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
      SELECT 
        it.id,
        it.quantity_change,
        it.notes,
        it.created_at,
        i.name as ingredient_name,
        i.unit
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
