import express from 'express';
import pool from '../config/database.js';
import { parseCsvLine } from '../utils/csvParser.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET all products with sizes
// Use ?all=true to include inactive products (for management)
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;

    // 1. Get products with composition count in a single query
    const productsQuery = `
      SELECT p.*, 
             COALESCE(pc.count, 0) as ingredient_count
      FROM products p
      LEFT JOIN (
        SELECT product_id, COUNT(*) as count 
        FROM product_composition 
        WHERE company_id = $1 
        GROUP BY product_id
      ) pc ON p.id = pc.product_id
      WHERE p.company_id = $1
      ${all === 'true' ? '' : 'AND p.active = true'}
      ORDER BY p.category, p.name
    `;
    const productsResult = await pool.query(productsQuery, [req.company_id]);

    // 2. Get all sizes and group them by product_id
    const sizesResult = await pool.query(
      'SELECT id, product_id, size_name, price, cost FROM product_sizes WHERE company_id = $1 ORDER BY price',
      [req.company_id]
    );
    const sizesMap = {};
    for (const size of sizesResult.rows) {
      if (!sizesMap[size.product_id]) sizesMap[size.product_id] = [];
      sizesMap[size.product_id].push({
        id: size.id,
        name: size.size_name,
        price: parseFloat(size.price),
        cost: parseFloat(size.cost || 0)
      });
    }

    // 3. Get all product-modifier assignments and group them
    const pmResult = await pool.query(
      'SELECT product_id, modifier_id FROM product_modifiers WHERE company_id = $1',
      [req.company_id]
    );
    const pmMap = {};
    for (const row of pmResult.rows) {
      if (!pmMap[row.product_id]) pmMap[row.product_id] = [];
      pmMap[row.product_id].push(row.modifier_id);
    }

    // 4. Map everything together efficiently
    const products = productsResult.rows.map(product => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price ? parseFloat(product.price) : null,
      sizes: sizesMap[product.id] || null,
      modifier_ids: pmMap[product.id] || [],
      description: product.description,
      image: product.image,
      popular: product.popular,
      barcode: product.barcode,
      sku: product.sku,
      cost: product.cost ? parseFloat(product.cost) : 0,
      active: product.active,
      stock_quantity: product.stock_quantity || 0,
      low_stock_threshold: product.low_stock_threshold || 10,
      ingredient_count: parseInt(product.ingredient_count) || 0
    }));

    const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;

    res.json({ success: true, products, lowStockCount });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET product by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    const productResult = await pool.query(
      'SELECT * FROM products WHERE barcode = $1 AND company_id = $2',
      [barcode, req.company_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = productResult.rows[0];
    const sizesResult = await pool.query(
      'SELECT * FROM product_sizes WHERE product_id = $1 AND company_id = $2 ORDER BY price',
      [product.id, req.company_id]
    );

    const sizes = sizesResult.rows.map(size => ({
      name: size.size_name,
      price: parseFloat(size.price),
      cost: parseFloat(size.cost || 0)
    }));

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price ? parseFloat(product.price) : null,
        sizes: sizes.length > 0 ? sizes : null,
        description: product.description,
        image: product.image,
        popular: product.popular,
        barcode: product.barcode,
        sku: product.sku,
        cost: product.cost ? parseFloat(product.cost) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const productResult = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND company_id = $2',
      [id, req.company_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const sizesResult = await pool.query(
      'SELECT * FROM product_sizes WHERE product_id = $1 AND company_id = $2 ORDER BY price',
      [id, req.company_id]
    );

    const product = productResult.rows[0];
    const sizes = sizesResult.rows.map(size => ({
      name: size.size_name,
      price: parseFloat(size.price),
      cost: parseFloat(size.cost || 0)
    }));

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price ? parseFloat(product.price) : null,
        sizes: sizes.length > 0 ? sizes : null,
        description: product.description,
        image: product.image,
        popular: product.popular,
        sku: product.sku
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// POST create product
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, category, price, sizes, description, image, popular, barcode, active, stock_quantity, low_stock_threshold, send_to_kitchen, sku, cost } = req.body;

    await client.query('BEGIN');

    const productResult = await client.query(
      `INSERT INTO products (name, category, price, description, image, popular, barcode, active, stock_quantity, low_stock_threshold, send_to_kitchen, sku, cost, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [name, category, price || null, description, image, popular || false, barcode || null, active !== false, stock_quantity || 0, low_stock_threshold || 10, send_to_kitchen !== false, sku || null, cost || 0, req.company_id]
    );

    const product = productResult.rows[0];

    // Insert sizes if provided
    if (sizes && sizes.length > 0) {
      for (const size of sizes) {
        await client.query(
          'INSERT INTO product_sizes (product_id, size_name, price, cost, company_id) VALUES ($1, $2, $3, $4, $5)',
          [product.id, size.name, size.price, size.cost || 0, req.company_id]
        );
      }
    }

    const newProductResult = await client.query(
      `SELECT p.*, (SELECT COUNT(*) FROM product_composition WHERE product_id = p.id AND company_id = $1) as ingredient_count 
       FROM products p WHERE p.id = $2 AND p.company_id = $1`,
      [req.company_id, productResult.rows[0].id]
    );

    await client.query('COMMIT');

    const finalProduct = newProductResult.rows[0];
    res.status(201).json({ 
      success: true, 
      product: {
        ...finalProduct,
        price: finalProduct.price ? parseFloat(finalProduct.price) : null,
        cost: finalProduct.cost ? parseFloat(finalProduct.cost) : 0,
        stock_quantity: finalProduct.stock_quantity || 0,
        low_stock_threshold: finalProduct.low_stock_threshold || 10,
        ingredient_count: parseInt(finalProduct.ingredient_count) || 0
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  } finally {
    client.release();
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, category, price, sizes, modifier_ids, description, image, popular, barcode, active, stock_quantity, low_stock_threshold, send_to_kitchen, sku, cost } = req.body;

    console.log('[PUT /products/:id] id:', id, '| sizes received:', JSON.stringify(sizes));

    await client.query('BEGIN');

    const productResult = await client.query(
      `UPDATE products
       SET name = $1, category = $2, price = $3, description = $4, image = $5, popular = $6, barcode = $7, active = $8, stock_quantity = $9, low_stock_threshold = $10, send_to_kitchen = $11, sku = $12, cost = $13, updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 AND company_id = $15 RETURNING *`,
      [name, category, price || null, description, image, popular || false, barcode || null, active !== false, stock_quantity || 0, low_stock_threshold || 10, send_to_kitchen !== false, sku || null, cost || 0, id, req.company_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Delete existing sizes and insert new ones
    await client.query('DELETE FROM product_sizes WHERE product_id = $1 AND company_id = $2', [id, req.company_id]);

    if (sizes && sizes.length > 0) {
      for (const size of sizes) {
        await client.query(
          'INSERT INTO product_sizes (product_id, size_name, price, cost, company_id) VALUES ($1, $2, $3, $4, $5)',
          [id, size.name, size.price, size.cost || 0, req.company_id]
        );
      }
    }

    // Save product-modifier assignments (delete + reinsert)
    await client.query('DELETE FROM product_modifiers WHERE product_id = $1 AND company_id = $2', [id, req.company_id]);
    if (Array.isArray(modifier_ids) && modifier_ids.length > 0) {
      for (const modId of modifier_ids) {
        await client.query(
          'INSERT INTO product_modifiers (product_id, modifier_id, company_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [id, modId, req.company_id]
        );
      }
    }

    const updatedResult = await client.query(
      `SELECT p.*, (SELECT COUNT(*) FROM product_composition WHERE product_id = p.id AND company_id = $1) as ingredient_count 
       FROM products p WHERE p.id = $2 AND p.company_id = $1`,
      [req.company_id, id]
    );

    await client.query('COMMIT');

    const finalProduct = updatedResult.rows[0];
    res.json({ 
      success: true, 
      product: {
        ...finalProduct,
        price: finalProduct.price ? parseFloat(finalProduct.price) : null,
        cost: finalProduct.cost ? parseFloat(finalProduct.cost) : 0,
        stock_quantity: finalProduct.stock_quantity || 0,
        low_stock_threshold: finalProduct.low_stock_threshold || 10,
        ingredient_count: parseInt(finalProduct.ingredient_count) || 0
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  } finally {
    client.release();
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, req.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

// GET low stock products
router.get('/inventory/low-stock', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE stock_quantity <= low_stock_threshold AND active = true AND company_id = $1 ORDER BY stock_quantity ASC',
      [req.company_id]
    );

    const products = result.rows.map(product => ({
      id: product.id,
      name: product.name,
      category: product.category,
      stock_quantity: product.stock_quantity || 0,
      low_stock_threshold: product.low_stock_threshold || 10
    }));

    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch low stock products' });
  }
});

// POST adjust stock (add or subtract)
router.post('/:id/stock', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE products
       SET stock_quantity = GREATEST(0, stock_quantity + $1), updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND company_id = $3 RETURNING *`,
      [adjustment, id, req.company_id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = result.rows[0];

    // Record the manual adjustment in the ledger
    await client.query(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_after, notes, created_by, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, 'manual_adjustment', adjustment, product.stock_quantity, reason || 'Manual stock update', 'admin', req.company_id]
    );

    await client.query('COMMIT');

    const isLowStock = product.stock_quantity <= product.low_stock_threshold;

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        isLowStock
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  } finally {
    client.release();
  }
});

// POST seed demo data
router.post('/seed-demo', async (req, res) => {
  const client = await pool.connect();
  try {
    const demoData = [
      { name: 'Margherita Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 10.99 }, { name: 'Medium', price: 12.99 }, { name: 'Large', price: 15.99 }], description: 'Classic tomato sauce, mozzarella, fresh basil', popular: true },
      { name: 'Pepperoni Pizza', category: 'Pizza', sizes: [{ name: 'Small', price: 12.99 }, { name: 'Medium', price: 14.99 }, { name: 'Large', price: 17.99 }], description: 'Loaded with pepperoni and mozzarella', popular: true },
      { name: 'Classic Burger', category: 'Burgers', price: 9.99, description: 'Beef patty, lettuce, tomato, cheese', popular: true },
      { name: 'Bacon Cheeseburger', category: 'Burgers', price: 11.99, description: 'Double beef, bacon, cheddar cheese', popular: true },
      { name: 'Coca Cola', category: 'Drinks', price: 2.99, description: 'Classic cola, 500ml', popular: true },
      { name: 'Fresh Lemonade', category: 'Drinks', price: 3.49, description: 'Freshly squeezed lemon juice', popular: true }
    ];

    await client.query('BEGIN');

    // First, check if company already has products
    const existing = await client.query('SELECT COUNT(*) FROM products WHERE company_id = $1', [req.company_id]);
    if (parseInt(existing.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Restaurant already has products. Purge first if you want a clean seed.' });
    }

    for (const item of demoData) {
      const productResult = await client.query(
        `INSERT INTO products (name, category, price, description, popular, active, stock_quantity, low_stock_threshold, send_to_kitchen, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [item.name, item.category, item.price || null, item.description, item.popular || false, true, 50, 5, true, req.company_id]
      );

      if (item.sizes && item.sizes.length > 0) {
        for (const size of item.sizes) {
          await client.query(
            'INSERT INTO product_sizes (product_id, size_name, price, company_id) VALUES ($1, $2, $3, $4)',
            [productResult.rows[0].id, size.name, size.price, req.company_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Demo data seeded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding demo data:', error);
    res.status(500).json({ success: false, error: 'Failed to seed demo data' });
  } finally {
    client.release();
  }
});

// POST bulk upload products via CSV
router.post('/bulk', async (req, res) => {
  const logPath = path.join(process.cwd(), 'import_log.txt');
  const log = (msg) => fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
  
  log(`Starting bulk import for company ${req.company_id}`);
  const client = await pool.connect();
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      log('Error: CSV content is missing');
      return res.status(400).json({ success: false, error: 'CSV content is required' });
    }
    log(`CSV size: ${csv.length} characters`);

    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      return res.status(400).json({ success: false, error: 'No data rows found in CSV' });
    }

    // CSV parsing helper to handle quotes and commas
    const parseCsvLine = (line) => {
      const out = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur.trim());
      return out;
    };

    const cleanHeader = (h) => h.toLowerCase().trim().replace(/^\uFEFF/, '');
    const parseSafeFloat = (val, defaultVal = 0) => {
      if (!val) return defaultVal;
      const clean = String(val).replace(/[^\d.-]/g, '');
      const n = parseFloat(clean);
      return isFinite(n) ? n : defaultVal;
    };

    const headers = parseCsvLine(lines[0]).map(cleanHeader);
    const nameIdx = headers.indexOf('name');
    const catIdx = headers.indexOf('category');
    const priceIdx = headers.indexOf('price');
    const skuIdx = headers.indexOf('sku');
    const costIdx = headers.indexOf('cost');
    
    // Flexible header matching for stock
    let stockIdx = headers.indexOf('stock_quantity');
    if (stockIdx === -1) stockIdx = headers.indexOf('current_stock');
    if (stockIdx === -1) stockIdx = headers.indexOf('stock');
    
    // Flexible header matching for threshold
    let lowIdx = headers.indexOf('low_stock_threshold');
    if (lowIdx === -1) lowIdx = headers.indexOf('low_stock');
    if (lowIdx === -1) lowIdx = headers.indexOf('threshold');
    if (lowIdx === -1) lowIdx = headers.indexOf('reorder_level');

    if (nameIdx === -1 || catIdx === -1) {
      return res.status(400).json({ success: false, error: 'CSV must contain "name" and "category" headers' });
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);
      if (parts.length < 2) continue;

      const name = parts[nameIdx];
      const category = parts[catIdx];
      if (!name || !category) continue;

      rows.push({
        name: name.trim(),
        category: category.trim(),
        price: priceIdx !== -1 ? parseSafeFloat(parts[priceIdx]) : 0,
        sku: skuIdx !== -1 ? (parts[skuIdx] ? parts[skuIdx].trim() : null) : null,
        cost: costIdx !== -1 ? parseSafeFloat(parts[costIdx]) : 0,
        stock_quantity: stockIdx !== -1 ? parseSafeFloat(parts[stockIdx]) : 0,
        low_stock_threshold: lowIdx !== -1 ? parseSafeFloat(parts[lowIdx], 10) : 10
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid rows to import' });
    }

    // Safety: Deduplicate rows by name (keeping the last one)
    const uniqueRowsMap = new Map();
    for (const row of rows) {
      uniqueRowsMap.set(row.name, row);
    }
    const finalRows = Array.from(uniqueRowsMap.values());
    log(`Found ${lines.length} lines in CSV, deduplicated to ${finalRows.length} unique products`);

    await client.query('BEGIN');
    try {
      log('Starting database transaction...');
      const names = finalRows.map(r => r.name);
      const categories = finalRows.map(r => r.category);
      const prices = finalRows.map(r => r.price);
      const skus = finalRows.map(r => r.sku);
      const costs = finalRows.map(r => r.cost);
      const stocks = finalRows.map(r => r.stock_quantity);
      const lows = finalRows.map(r => r.low_stock_threshold);
      const companies = finalRows.map(() => req.company_id);

      const query = `
        INSERT INTO products (name, category, price, sku, cost, stock_quantity, low_stock_threshold, company_id)
        SELECT * FROM UNNEST($1::text[], $2::text[], $3::numeric[], $4::text[], $5::numeric[], $6::numeric[], $7::numeric[], $8::uuid[])
        ON CONFLICT (name, company_id) DO UPDATE SET
          category = EXCLUDED.category,
          price = EXCLUDED.price,
          sku = EXCLUDED.sku,
          cost = EXCLUDED.cost,
          stock_quantity = EXCLUDED.stock_quantity,
          low_stock_threshold = EXCLUDED.low_stock_threshold,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, name, stock_quantity
      `;
      
      log('Inserting/Updating products...');
      const result = await client.query(query, [names, categories, prices, skus, costs, stocks, lows, companies]);
      const insertedProducts = result.rows;
      log(`Database operation finished. ${insertedProducts.length} rows processed.`);

      // Batch insert ledger entries for ALL products at once
      if (insertedProducts.length > 0) {
        log('Inserting inventory ledger entries...');
        const pIds = insertedProducts.map(p => p.id);
        const pStocks = insertedProducts.map(p => p.stock_quantity);
        const pTypes = insertedProducts.map(() => 'manual_adjustment');
        const pChanges = insertedProducts.map(() => 0);
        const pNotes = insertedProducts.map(() => 'Bulk CSV Import/Update');
        const pActors = insertedProducts.map(() => 'admin');
        const pCompanies = insertedProducts.map(() => req.company_id);

        await client.query(`
          INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, quantity_after, notes, created_by, company_id)
          SELECT * FROM UNNEST($1::int[], $2::text[], $3::numeric[], $4::numeric[], $5::text[], $6::text[], $7::uuid[])
        `, [pIds, pTypes, pChanges, pStocks, pNotes, pActors, pCompanies]);
        log('Ledger entries inserted.');
      }

      await client.query('COMMIT');
      log('Transaction committed successfully.');
      res.json({ success: true, imported: insertedProducts.length, products: insertedProducts });
    } catch (err) {
      log(`DATABASE ERROR: ${err.message}`);
      await client.query('ROLLBACK');
      console.error('Error during products bulk transaction:', err);
      throw err;
    }
  } catch (error) {
    console.error('Error bulk uploading products:', error);
    // Return detailed error message to help debug
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to import products',
      detail: error.detail || null,
      code: error.code || null
    });
  } finally {
    client.release();
  }
});

export default router;
