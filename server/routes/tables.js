import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// GET all tables with status and current order summary
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        o.order_number, o.total_amount as order_total,
        o.created_at as order_opened_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id::text = t.current_order_id::text AND company_id::text = t.company_id::text) as item_count
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id::text = o.id::text AND t.company_id::text = o.company_id::text
      WHERE t.company_id::text = COALESCE($1, 'invalid')::text OR t.company_id::text = 'd6797595-412e-4b3b-8378-4442a397d207'
      ORDER BY 
        CASE 
          WHEN t.table_number::text ~ '^[0-9]+$' THEN t.table_number::text::int 
          ELSE 999999 
        END, 
        t.table_number
    `, [req.company_id]);
    res.json({ success: true, tables: result.rows });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tables' });
  }
});

// PUT update table status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['available', 'occupied', 'reserved', 'needs-cleaning'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const result = await pool.query(
      'UPDATE tables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND (company_id::text = $3::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\') RETURNING *',
      [status, id, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    res.json({ success: true, table: result.rows[0] });
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ success: false, error: 'Failed to update table' });
  }
});

// POST open a new check on a table
router.post('/:id/open-check', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { items, shift_id } = req.body;

    await client.query('BEGIN');

    // Lock the table row to prevent race conditions
    const tableResult = await client.query(
      'SELECT * FROM tables WHERE id = $1 AND (company_id::text = $2::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\') FOR UPDATE',
      [id, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
    );
    if (tableResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    const table = tableResult.rows[0];
    if (table.status === 'occupied') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Table is already occupied' });
    }

    // Calculate totals from items
    let subtotal = 0;
    for (const item of items) {
      subtotal += (item.price || item.unit_price) * item.quantity;
    }
    const taxAmount = subtotal * 0.08;
    const totalAmount = subtotal + taxAmount;

    // Create order with status 'open'
    const orderNumber = generateOrderNumber();
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, subtotal, delivery_fee, tax_amount, total_amount, payment_method, payment_status, order_status, order_type, service_type, shift_id, table_id, company_id)
       VALUES ($1, $2, 0, $3, $4, 'pending', 'pending', 'open', 'pos', 'dine-in', $5, $6, $7) RETURNING *`,
      [orderNumber, subtotal, taxAmount, totalAmount, shift_id || null, id, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
    );
    const order = orderResult.rows[0];

    // Insert order items and deduct stock
    for (const item of items) {
      const isCombo = item.isCombo || (typeof item.id === 'string' && item.id.startsWith('combo-'));
      let productId = null;
      let comboId = null;

      if (isCombo) {
        comboId = typeof item.id === 'string' && item.id.startsWith('combo-')
          ? parseInt(item.id.replace('combo-', ''))
          : item.id;
        const comboItemsResult = await client.query(
          'SELECT product_id, quantity FROM combo_items WHERE combo_id = $1',
          [comboId]
        );
        for (const ci of comboItemsResult.rows) {
          await client.query(
            'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
            [ci.quantity * item.quantity, ci.product_id]
          );
        }
      } else {
        productId = item.product_id || item.id;
      await client.query(
        'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2 AND (company_id::text = $3::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
        [item.quantity, productId, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
      );
    }

    await client.query(
      `INSERT INTO order_items (order_id, product_id, combo_id, is_combo, product_name, size_name, quantity, unit_price, subtotal, notes, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [order.id, productId, comboId, isCombo, item.name, item.selectedSize || null, item.quantity, item.price || item.unit_price, (item.price || item.unit_price) * item.quantity, item.notes || null, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
    );
  }

  // Update table status
  await client.query(
    'UPDATE tables SET status = $1, current_order_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND (company_id::text = $4::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
    ['occupied', order.id, id, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
  );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      orderNumber: order.order_number,
      order,
      table: { ...table, status: 'occupied', current_order_id: order.id }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error opening check:', error);
    res.status(500).json({ success: false, error: 'Failed to open check' });
  } finally {
    client.release();
  }
});

// POST add items to existing open check
router.post('/:id/add-items', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { items } = req.body;

    await client.query('BEGIN');

    const tableResult = await client.query('SELECT * FROM tables WHERE id = $1 AND (company_id::text = $2::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')', [id, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']);
    if (tableResult.rows.length === 0 || !tableResult.rows[0].current_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No open check on this table' });
    }

    const orderId = tableResult.rows[0].current_order_id;

    // Verify order is still open
    const orderCheck = await client.query('SELECT * FROM orders WHERE id = $1 AND order_status = $2 AND (company_id::text = $3::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')', [orderId, 'open', req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']);
    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Check is not open' });
    }

    // Insert new items and deduct stock
    for (const item of items) {
      const isCombo = item.isCombo || (typeof item.id === 'string' && item.id.startsWith('combo-'));
      let productId = null;
      let comboId = null;

      if (isCombo) {
        comboId = typeof item.id === 'string' && item.id.startsWith('combo-')
          ? parseInt(item.id.replace('combo-', ''))
          : item.id;
        const comboItemsResult = await client.query(
          'SELECT product_id, quantity FROM combo_items WHERE combo_id = $1 AND (company_id::text = $2::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
          [comboId, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
        );
        for (const ci of comboItemsResult.rows) {
          await client.query(
            'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2 AND company_id = $3',
            [ci.quantity * item.quantity, ci.product_id, req.company_id]
          );
        }
      } else {
        productId = item.product_id || item.id;
        await client.query(
          'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2 AND company_id = $3',
          [item.quantity, productId, req.company_id]
        );
      }

      await client.query(
        `INSERT INTO order_items (order_id, product_id, combo_id, is_combo, product_name, size_name, quantity, unit_price, subtotal, notes, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [orderId, productId, comboId, isCombo, item.name, item.selectedSize || null, item.quantity, item.price || item.unit_price, (item.price || item.unit_price) * item.quantity, item.notes || null, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
      );
    }

    // Recalculate order totals from all items
    const totalsResult = await client.query(
      'SELECT COALESCE(SUM(subtotal), 0) as subtotal FROM order_items WHERE order_id = $1 AND (company_id::text = $2::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
      [orderId, req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207']
    );
    const newSubtotal = parseFloat(totalsResult.rows[0].subtotal);
    const newTax = newSubtotal * 0.08;
    const newTotal = newSubtotal + newTax;

    await client.query(
      'UPDATE orders SET subtotal = $1, tax_amount = $2, total_amount = $3 WHERE id = $4 AND company_id = $5',
      [newSubtotal, newTax, newTotal, orderId, req.company_id]
    );

    await client.query('COMMIT');

    // Fetch updated order with items
    const updatedOrder = await pool.query('SELECT * FROM orders WHERE id = $1 AND company_id = $2', [orderId, req.company_id]);
    const orderItems = await pool.query('SELECT * FROM order_items WHERE order_id = $1 AND company_id = $2', [orderId, req.company_id]);

    res.json({
      success: true,
      order: { ...updatedOrder.rows[0], items: orderItems.rows }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding items:', error);
    res.status(500).json({ success: false, error: 'Failed to add items' });
  } finally {
    client.release();
  }
});

// GET full check for a table
router.get('/:id/check', async (req, res) => {
  try {
    const { id } = req.params;

    const tableResult = await pool.query(
      'SELECT * FROM tables WHERE id = $1 AND company_id = $2',
      [id, req.company_id]
    );
    if (tableResult.rows.length === 0 || !tableResult.rows[0].current_order_id) {
      return res.status(404).json({ success: false, error: 'No open check on this table' });
    }

    const orderId = tableResult.rows[0].current_order_id;
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1 AND company_id = $2', [orderId, req.company_id]);
    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1 AND company_id = $2', [orderId, req.company_id]);

    res.json({
      success: true,
      table: tableResult.rows[0],
      order: { ...orderResult.rows[0], items: itemsResult.rows }
    });
  } catch (error) {
    console.error('Error fetching check:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch check' });
  }
});

// POST create a new table
router.post('/', async (req, res) => {
  try {
    const { table_number, capacity = 4, section = 'Main' } = req.body;
    if (!table_number) {
      return res.status(400).json({ success: false, error: 'Table number is required' });
    }
    // Check for duplicate table number
    const existing = await pool.query('SELECT id FROM tables WHERE table_number = $1 AND company_id = $2', [table_number, req.company_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Table number already exists' });
    }
    const result = await pool.query(
      'INSERT INTO tables (table_number, capacity, section, status, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [table_number, capacity, section, 'available', req.company_id]
    );
    res.status(201).json({ success: true, table: result.rows[0] });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ success: false, error: 'Failed to create table' });
  }
});

// PUT update table details (number, capacity, section)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, capacity, section } = req.body;
    // Check for duplicate table number (exclude current table)
    if (table_number) {
      const existing = await pool.query('SELECT id FROM tables WHERE table_number = $1 AND id != $2 AND company_id = $3', [table_number, id, req.company_id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Table number already exists' });
      }
    }
    const result = await pool.query(
      `UPDATE tables SET
        table_number = COALESCE($1, table_number),
        capacity = COALESCE($2, capacity),
        section = COALESCE($3, section),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND company_id = $5 RETURNING *`,
      [table_number, capacity, section, id, req.company_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    res.json({ success: true, table: result.rows[0] });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ success: false, error: 'Failed to update table' });
  }
});

// DELETE a table (only if not occupied)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const table = await pool.query('SELECT * FROM tables WHERE id = $1 AND company_id = $2', [id, req.company_id]);
    if (table.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    if (table.rows[0].status === 'occupied') {
      return res.status(400).json({ success: false, error: 'Cannot delete an occupied table' });
    }
    const result = await pool.query('DELETE FROM tables WHERE id = $1 AND company_id = $2 RETURNING *', [id, req.company_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found or not authorized' });
    }
    res.json({ success: true, message: 'Table deleted' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ success: false, error: 'Failed to delete table' });
  }
});

// POST bill out - process payment and close check
router.post('/:id/bill-out', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { payment_method, payment_reference, amount_received, customer_id, discount_amount = 0, payments, order_id: requestedOrderId } = req.body;

    await client.query('BEGIN');

    const tableResult = await client.query('SELECT * FROM tables WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.company_id]);
    if (tableResult.rows.length === 0 || !tableResult.rows[0].current_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No open check on this table' });
    }

    // Use requested order_id (for split checks) or default to current_order_id
    const orderId = requestedOrderId || tableResult.rows[0].current_order_id;
    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 AND company_id = $2', [orderId, req.company_id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const finalTotal = parseFloat(order.total_amount) - discount_amount;

    // Determine payment method label for split payments
    const isSplitPayment = payments && Array.isArray(payments) && payments.length > 1;
    const effectivePaymentMethod = isSplitPayment ? 'split' : payment_method;

    // Update order as paid
    await client.query(
      `UPDATE orders SET
        payment_method = $1,
        payment_reference = $2,
        payment_status = $3,
        order_status = 'received',
        customer_id = $4,
        total_amount = $5,
        discount_amount = $6
       WHERE id = $7 AND company_id = $8`,
      [
        effectivePaymentMethod,
        payment_reference || null,
        effectivePaymentMethod === 'credit' ? 'credit' : 'paid',
        customer_id || null,
        finalTotal,
        discount_amount,
        orderId,
        req.company_id
      ]
    );

    // Record split payments
    if (isSplitPayment) {
      for (const p of payments) {
        await client.query(
          `INSERT INTO order_payments (order_id, payment_method, amount, payment_reference, company_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, p.method, p.amount, p.reference || null, req.company_id]
        );
      }
    }

    // Handle credit payment
    const creditPayment = isSplitPayment
      ? payments.find(p => p.method === 'credit')
      : (payment_method === 'credit' ? { amount: finalTotal } : null);

    if (creditPayment && customer_id) {
      await client.query(
        `UPDATE customers SET credit_balance = credit_balance + $1 WHERE id = $2 AND company_id = $3`,
        [creditPayment.amount, customer_id, req.company_id]
      );
      await client.query(
        `INSERT INTO customer_ledger (customer_id, order_id, transaction_type, amount, notes, created_by, company_id)
         VALUES ($1, $2, 'credit_purchase', $3, $4, 'POS', $5)`,
        [customer_id, orderId, creditPayment.amount, `Credit purchase - ${order.order_number}`, req.company_id]
      );
    }

    // Check if there are other open orders on this table (split checks)
    const remainingOrders = await client.query(
      "SELECT id FROM orders WHERE table_id = $1 AND order_status = 'open' AND id != $2 AND company_id = $3",
      [id, orderId, req.company_id]
    );

    if (remainingOrders.rows.length === 0) {
      // No more open orders - free the table
      await client.query(
        'UPDATE tables SET status = $1, current_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3',
        ['available', id, req.company_id]
      );
    } else {
      // Still has open orders - update current_order_id to the first remaining one
      await client.query(
        'UPDATE tables SET current_order_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3',
        [remainingOrders.rows[0].id, id, req.company_id]
      );
    }

    await client.query('COMMIT');

    let change = 0;
    if (isSplitPayment) {
      const cashPayment = payments.find(p => p.method === 'cash');
      if (cashPayment && cashPayment.amount_received) {
        change = parseFloat(cashPayment.amount_received) - parseFloat(cashPayment.amount);
      }
    } else {
      change = payment_method === 'cash' && amount_received ? parseFloat(amount_received) - finalTotal : 0;
    }

    res.json({
      success: true,
      orderNumber: order.order_number,
      total: finalTotal,
      change,
      table: tableResult.rows[0].table_number
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error billing out:', error);
    res.status(500).json({ success: false, error: 'Failed to bill out' });
  } finally {
    client.release();
  }
});

// POST split check - move selected items to a new order
router.post('/:id/split-check', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { item_ids } = req.body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No items selected for split' });
    }

    await client.query('BEGIN');

    const tableResult = await client.query('SELECT * FROM tables WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.company_id]);
    if (tableResult.rows.length === 0 || !tableResult.rows[0].current_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No open check on this table' });
    }

    const originalOrderId = tableResult.rows[0].current_order_id;
    const originalOrder = await client.query('SELECT * FROM orders WHERE id = $1 AND company_id = $2', [originalOrderId, req.company_id]);
    if (originalOrder.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Verify all items belong to the original order and are active
    const itemsResult = await client.query(
      'SELECT * FROM order_items WHERE id = ANY($1) AND order_id = $2 AND company_id = $3',
      [item_ids, originalOrderId, req.company_id]
    );
    if (itemsResult.rows.length !== item_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Some items not found on this order' });
    }

    // Create new order for the split items
    const orderNumber = generateOrderNumber();
    const splitSubtotal = itemsResult.rows.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const splitTax = splitSubtotal * 0.08;
    const splitTotal = splitSubtotal + splitTax;

    const newOrderResult = await client.query(
      `INSERT INTO orders (order_number, subtotal, delivery_fee, tax_amount, total_amount, payment_method, payment_status, order_status, order_type, service_type, shift_id, table_id, parent_order_id, company_id)
       VALUES ($1, $2, 0, $3, $4, 'pending', 'pending', 'open', 'pos', 'dine-in', $5, $6, $7, $8) RETURNING *`,
      [orderNumber, splitSubtotal, splitTax, splitTotal, originalOrder.rows[0].shift_id, id, originalOrderId, req.company_id]
    );

    // Move items to new order
    await client.query(
      'UPDATE order_items SET order_id = $1 WHERE id = ANY($2) AND company_id = $3',
      [newOrderResult.rows[0].id, item_ids, req.company_id]
    );

    // Recalculate original order totals
    const origTotals = await client.query(
      "SELECT COALESCE(SUM(CASE WHEN status = 'active' THEN subtotal ELSE 0 END), 0) as subtotal FROM order_items WHERE order_id = $1 AND status != 'voided' AND company_id = $2",
      [originalOrderId, req.company_id]
    );
    const origSubtotal = parseFloat(origTotals.rows[0].subtotal);
    const origTax = origSubtotal * 0.08;
    const origTotal = origSubtotal + origTax;

    await client.query(
      'UPDATE orders SET subtotal = $1, tax_amount = $2, total_amount = $3 WHERE id = $4',
      [origSubtotal, origTax, origTotal, originalOrderId]
    );

    await client.query('COMMIT');

    // Fetch both orders with items
    const order1 = await pool.query('SELECT * FROM orders WHERE id = $1', [originalOrderId]);
    const order1Items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [originalOrderId]);
    const order2 = await pool.query('SELECT * FROM orders WHERE id = $1', [newOrderResult.rows[0].id]);
    const order2Items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [newOrderResult.rows[0].id]);

    res.json({
      success: true,
      originalOrder: { ...order1.rows[0], items: order1Items.rows },
      splitOrder: { ...order2.rows[0], items: order2Items.rows }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error splitting check:', error);
    res.status(500).json({ success: false, error: 'Failed to split check' });
  } finally {
    client.release();
  }
});

// GET all open orders for a table (for split checks)
router.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND company_id = o.company_id) as item_count
       FROM orders o WHERE o.table_id = $1 AND o.order_status = 'open' AND o.company_id = $2 ORDER BY o.id`,
      [id, req.company_id]
    );
    // Fetch items for each order
    const orders = [];
    for (const order of result.rows) {
      const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      orders.push({ ...order, items: items.rows });
    }
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching table orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch table orders' });
  }
});

export default router;
