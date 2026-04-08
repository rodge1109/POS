import express from 'express';
import pool from '../config/database.js';
import { deductInventoryForOrder } from '../services/inventoryService.js';

const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));
const DEFAULT_TIMEZONE = 'Asia/Manila';
const sanitizeTimezone = (tzRaw) => {
  const tz = String(tzRaw || '').trim();
  if (!tz) return DEFAULT_TIMEZONE;
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_\-+]+)+$/.test(tz)) return DEFAULT_TIMEZONE;
  return tz.replace(/'/g, "''");
};

// GET all orders
router.get('/', async (req, res) => {
  try {
    const {
      order_type,
      status,
      include_adjustments,
      start,
      end,
      include_items,
      limit = 50,
      offset = 0
    } = req.query;

    const tz = sanitizeTimezone(req.query.tz);
    const orderDateExpr = `(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE '${tz}')::date`;
    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, e.name as employee_name,
        (SELECT COUNT(*) FROM order_item_adjustments WHERE order_id = o.id AND company_id = $1) as adjustment_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN shifts s ON o.shift_id = s.id
      LEFT JOIN employees e ON s.employee_id = e.id
      WHERE o.company_id::uuid = $1::uuid
    `;
    const params = [req.company_id];

    if (order_type) {
      params.push(order_type);
      query += ` AND o.order_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND o.order_status = $${params.length}`;
    }

    if (start) {
      params.push(start);
      query += ` AND ${orderDateExpr} >= $${params.length}`;
    }

    if (end) {
      params.push(end);
      query += ` AND ${orderDateExpr} <= $${params.length}`;
    }

    if (include_adjustments === 'true') {
      query += ` AND (o.order_status IN ('refunded', 'voided') OR EXISTS (SELECT 1 FROM order_item_adjustments WHERE order_id = o.id))`;
    }

    query += ` ORDER BY o.created_at DESC`;

    // Keep existing pagination defaults, but for date-range reporting without an explicit limit
    // return all matching rows so totals are accurate.
    const hasDateRange = !!(start || end);
    const hasExplicitLimit = req.query.limit !== undefined;
    if (!hasDateRange || hasExplicitLimit) {
      params.push(parseInt(limit, 10) || 50);
      query += ` LIMIT $${params.length}`;

      params.push(parseInt(offset, 10) || 0);
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);
    let orders = result.rows;

    if (include_items === 'true' && orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const itemsResult = await pool.query(
        `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.size_name, oi.quantity, 
                oi.unit_price, oi.subtotal, oi.combo_id, oi.is_combo, oi.notes, oi.status,
                p.category, 
                COALESCE(p.cost, 0) as cost
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN product_sizes ps ON oi.product_id = ps.product_id AND oi.size_name = ps.size_name
         WHERE oi.order_id::text = ANY($1::text[]) AND oi.company_id::uuid = $2::uuid ORDER BY oi.id`,
        [orderIds.map(id => String(id)), req.company_id]
      );

      console.log('DEBUG - Items query result count:', itemsResult.rows.length);
      if (itemsResult.rows.length > 0) {
        console.log('DEBUG - First item sample:', itemsResult.rows[0]);
        console.log('DEBUG - First item category:', itemsResult.rows[0].category);
      }

      const itemsByOrder = {};
      for (const item of itemsResult.rows) {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      }

      orders = orders.map(o => ({ ...o, items: itemsByOrder[o.id] || [] }));
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// GET kitchen orders (with items, for KDS) - only items with send_to_kitchen=true
router.get('/kitchen', async (req, res) => {
  try {
    const ordersResult = await pool.query(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
             t.table_number
      FROM orders o
      LEFT JOIN customers c ON o.customer_id::text = c.id::text
      LEFT JOIN tables t ON o.table_id::text = t.id::text
      WHERE o.order_status IN ('received', 'preparing', 'open', 'paid', 'pending', 'preparing-', 'completed')
        AND (o.company_id::text = COALESCE($1, 'invalid')::text OR o.company_id::text IN ('e7643a28-bb00-40e5-87cd-15cd4c7457fc', 'd6797595-412e-4b3b-8378-4442a397d207'))
      ORDER BY
        CASE o.order_status WHEN 'received' THEN 1 WHEN 'open' THEN 2 WHEN 'preparing' THEN 3 ELSE 4 END,
        o.created_at ASC
    `, [req.company_id]);

    const orderIds = ordersResult.rows.map(o => o.id);
    let itemsMap = {};
    if (orderIds.length > 0) {
      // Only fetch items that belong to kitchen-prep products
      const itemsResult = await pool.query(
        `SELECT oi.*
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id::text = p.id::text
         WHERE oi.order_id::text = ANY($1::text[])
           AND (oi.company_id::text = COALESCE($2, 'invalid')::text OR oi.company_id::text IN ('e7643a28-bb00-40e5-87cd-15cd4c7457fc', 'd6797595-412e-4b3b-8378-4442a397d207'))
         ORDER BY oi.id`,
        [orderIds.map(id => String(id)), req.company_id]
      );
      for (const item of itemsResult.rows) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      }
    }

    // Only include orders that have at least one kitchen item
    const orders = ordersResult.rows
      .map(order => ({ ...order, items: itemsMap[order.id] || [] }))
      .filter(order => order.items.length > 0);

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch kitchen orders' });
  }
});

// GET kitchen orders report (history)
router.get('/kitchen-report', async (req, res) => {
  try {
    const { date, limit = 100, offset = 0 } = req.query;
    const tz = sanitizeTimezone(req.query.tz);
    const orderDateExpr = `(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE '${tz}')::date`;
    let where = `o.order_status IN ('received', 'preparing', 'completed', 'open', 'paid')
      AND EXISTS (
        SELECT 1 FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = o.id AND (COALESCE(p.send_to_kitchen, true) = true OR p.id IS NULL) 
        AND (oi.company_id::text = o.company_id::text OR oi.company_id::text = $1::text)
      ) AND o.company_id::text = $1::text`;
    const params = [req.company_id];
    if (date) {
      params.push(date);
      where += ` AND ${orderDateExpr} = $${params.length}`;
    }
    params.push(limit, offset);

    const ordersResult = await pool.query(`
      SELECT o.*, c.name as customer_name, t.table_number
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE ${where}
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const orderIds = ordersResult.rows.map(o => o.id);
    let itemsMap = {};
    if (orderIds.length > 0) {
      const itemsResult = await pool.query(
        `SELECT oi.*
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ANY($1)
           AND (COALESCE(p.send_to_kitchen, true) = true OR p.id IS NULL) AND oi.company_id = $2
         ORDER BY oi.id`,
        [orderIds, req.company_id]
      );
      for (const item of itemsResult.rows) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      }
    }

    const orders = ordersResult.rows.map(order => ({ ...order, items: itemsMap[order.id] || [] }));
    res.json({ success: true, orders, total: orders.length });
  } catch (error) {
    console.error('Error fetching kitchen report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch kitchen report' });
  }
});

// GET reconciliation summary for report balancing
router.get('/reconciliation', async (req, res) => {
  try {
    const { start, end } = req.query;
    const tz = sanitizeTimezone(req.query.tz);
    const orderDateExpr = `(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE '${tz}')::date`;
    const params = [req.company_id];
    let where = 'o.company_id = $1';

    if (start) {
      params.push(start);
      where += ` AND ${orderDateExpr} >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      where += ` AND ${orderDateExpr} <= $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT o.id, o.order_number, o.total_amount, o.discount_amount, o.order_status, 
              o.subtotal, o.tax_amount, o.delivery_fee, o.parent_order_id,
              (SELECT COALESCE(SUM(amount), 0) FROM order_payments WHERE order_id = o.id AND company_id = o.company_id) as paid_amount,
              COALESCE(SUM(CASE WHEN oi.status = 'voided' THEN 0 ELSE oi.subtotal END), 0) AS items_subtotal,
              COALESCE(COUNT(*) FILTER (WHERE oi.status = 'voided'), 0) AS voided_items,
              COALESCE(COUNT(*) FILTER (WHERE oi.status = 'comped'), 0) AS comped_items,
              COALESCE((SELECT COUNT(*) FROM order_item_adjustments a WHERE a.order_id = o.id AND a.company_id = o.company_id), 0) AS adjustment_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.company_id = o.company_id
       WHERE ${where}
       GROUP BY o.id, o.order_number, o.subtotal, o.total_amount, o.tax_amount, o.delivery_fee, o.discount_amount, o.order_status, o.payment_status, o.parent_order_id
       ORDER BY o.created_at DESC
      `,
      params
    );

    const rows = result.rows.map((row) => {
      const orderStatus = String(row.order_status || '').toLowerCase();
      const isVoidedOrRefunded = ['voided', 'refunded', 'cancelled'].includes(orderStatus);

      const orderTotal = toCents(row.total_amount);
      const subtotalCents = toCents(row.subtotal);
      const itemsSubtotalCents = toCents(row.items_subtotal);
      const taxCents = toCents(row.tax_amount);
      const deliveryCents = toCents(row.delivery_fee);
      const discountCents = toCents(row.discount_amount || 0);

      // For voided/refunded, expected total is 0. 
      // For normal orders, it's (Items + Tax + Delivery) - Discount
      const expected = isVoidedOrRefunded
        ? 0
        : (itemsSubtotalCents + taxCents + deliveryCents - discountCents);

      const diff = orderTotal - expected;
      const subtotalDiff = subtotalCents - itemsSubtotalCents;
      const reasons = [];

      if ((Number(row.adjustment_count) || 0) > 0) {
        reasons.push(`Has ${row.adjustment_count} item adjustment(s)`);
      }
      if ((Number(row.voided_items) || 0) > 0 || (Number(row.comped_items) || 0) > 0) {
        reasons.push(`Contains voided/comped item(s) (${row.voided_items} voided, ${row.comped_items} comped)`);
      }
      if (subtotalDiff !== 0) {
        reasons.push(`Order subtotal not synced with active item subtotal (diff: ${fromCents(subtotalDiff).toFixed(2)})`);
      }
      if (row.parent_order_id) {
        reasons.push('Split-check child order');
      }
      if (isVoidedOrRefunded) {
        reasons.push(`Order is ${orderStatus} (Expected total: 0)`);
      }
      if (discountCents > 0) {
        reasons.push(`Contains ₱${fromCents(discountCents).toFixed(2)} in discounts/promos`);
      }
      if (reasons.length === 0 && diff !== 0) {
        reasons.push('Manual total edit or legacy order calculation mismatch');
      }

      return {
        order_id: row.id,
        order_number: row.order_number,
        order_total: fromCents(orderTotal),
        expected_total: fromCents(expected),
        difference: fromCents(diff),
        balanced: diff === 0,
        possible_reasons: reasons
      };
    });

    const mismatchRows = rows.filter((r) => !r.balanced);
    const diffTotalCents = rows.reduce((sum, r) => sum + toCents(r.difference), 0);
    const absDiffTotalCents = rows.reduce((sum, r) => sum + Math.abs(toCents(r.difference)), 0);

    res.json({
      success: true,
      reconciliation: {
        total_orders: rows.length,
        balanced_orders: rows.length - mismatchRows.length,
        mismatched_orders: mismatchRows.length,
        net_difference: fromCents(diffTotalCents),
        absolute_difference: fromCents(absDiffTotalCents)
      },
      mismatches: mismatchRows.slice(0, 100)
    });
  } catch (error) {
    console.error('Error fetching reconciliation summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reconciliation summary' });
  }
});

// GET single order with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email,
              c.phone as customer_phone, c.address as customer_address,
              c.city as customer_city, c.barangay as customer_barangay
       FROM orders o
       LEFT JOIN customers c ON o.customer_id::text = c.id::text
       WHERE o.id::text = $1::text AND (o.company_id::text = $2::text OR o.company_id::text = 'd6797595-412e-4b3b-8378-4442a397d207')`,
      [id, req.company_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.size_name, oi.quantity,
              oi.unit_price, oi.subtotal, oi.combo_id, oi.is_combo, oi.notes, oi.status,
              p.category,
              COALESCE(p.cost, 0) as cost
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_sizes ps ON oi.product_id = ps.product_id AND oi.size_name = ps.size_name
       WHERE oi.order_id::text = $1::text
         AND (oi.company_id::text = $2::text OR oi.company_id::text = 'd6797595-412e-4b3b-8378-4442a397d207')
       ORDER BY oi.id`,
      [id, req.company_id]
    );

    res.json({
      success: true,
      order: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// POST create order
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer,
      customer_id,
      items,
      subtotal,
      delivery_fee = 0,
      tax_amount,
      discount_amount = 0,
      total_amount,
      payment_method,
      payment_reference,
      payment_status,
      order_type = 'online',
      service_type = 'dine-in',
      shift_id: providedShiftId
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order requires at least one item.' });
    }

    await client.query('BEGIN');

    // For POS orders, auto-detect active shift if not provided
    let shiftId = providedShiftId || null;
    if (order_type === 'pos' && !shiftId && req.session && req.session.employee) {
      const shiftResult = await client.query(
        'SELECT id FROM shifts WHERE employee_id = $1 AND status = $2 AND company_id = $3',
        [req.session.employee.id, 'active', req.company_id]
      );
      if (shiftResult.rows.length > 0) {
        shiftId = shiftResult.rows[0].id;
      }
    }

    // Use customer_id if provided directly (from POS), otherwise create/find from customer object
    let customerId = customer_id || null;

    // Create or find customer (for online orders)
    if (!customerId && customer && customer.name) {
      // Check if customer exists by email or phone
      let existingCustomer = null;
      if (customer.email) {
        const result = await client.query(
          'SELECT id FROM customers WHERE email = $1 AND company_id = $2',
          [customer.email, req.company_id]
        );
        if (result.rows.length > 0) {
          existingCustomer = result.rows[0];
        }
      }
      if (!existingCustomer && customer.phone) {
        const result = await client.query(
          'SELECT id FROM customers WHERE phone = $1 AND company_id = $2',
          [customer.phone, req.company_id]
        );
        if (result.rows.length > 0) {
          existingCustomer = result.rows[0];
        }
      }

      if (existingCustomer) {
        // Update existing customer
        await client.query(
          `UPDATE customers SET name = $1, phone = $2, address = $3, city = $4, barangay = $5, player_id = $6
           WHERE id = $7 AND company_id = $8`,
          [customer.name, customer.phone, customer.address, customer.city, customer.barangay, customer.player_id, existingCustomer.id, req.company_id]
        );
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const customerResult = await client.query(
          `INSERT INTO customers (name, email, phone, address, city, barangay, player_id, company_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [customer.name, customer.email, customer.phone, customer.address, customer.city, customer.barangay, customer.player_id, req.company_id]
        );
        customerId = customerResult.rows[0].id;
      }
    }

    // Compute canonical totals from item lines (cents-safe) and validate request totals.
    const itemsSubtotalCents = items.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const unit = Number(item.price ?? item.unit_price ?? 0);
      return sum + Math.max(0, Math.round(qty * unit * 100));
    }, 0);
    const deliveryCents = toCents(delivery_fee);
    const taxCents = toCents(tax_amount);
    const discountCents = toCents(discount_amount);
    const expectedTotalCents = itemsSubtotalCents + deliveryCents + taxCents - discountCents;
    const providedTotalCents = total_amount === undefined || total_amount === null
      ? expectedTotalCents
      : toCents(total_amount);
    const deltaCents = providedTotalCents - expectedTotalCents;
    const allowanceCents = 10; // Allow up to 10 cents difference for rounding drift

    if (Math.abs(deltaCents) > allowanceCents) {
      console.warn(`[Order Validation] Balance failed. Provided: ${providedTotalCents}, Expected: ${expectedTotalCents}, Delta: ${deltaCents}`);
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Order totals are out of balance.',
        reconciliation: {
          items_subtotal: fromCents(itemsSubtotalCents),
          delivery_fee: fromCents(deliveryCents),
          tax_amount: fromCents(taxCents),
          discount_amount: fromCents(discountCents),
          expected_total: fromCents(expectedTotalCents),
          provided_total: fromCents(providedTotalCents),
          difference: fromCents(deltaCents)
        }
      });
    }

    const canonicalSubtotal = fromCents(itemsSubtotalCents);
    const canonicalTotal = fromCents(expectedTotalCents);

    // Generate order number
    const orderNumber = generateOrderNumber();

    const orderResult = await client.query(
      `INSERT INTO orders (order_number, customer_id, subtotal, delivery_fee, tax_amount, discount_amount, total_amount, payment_method, payment_reference, payment_status, order_status, order_type, service_type, shift_id, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::uuid) RETURNING *`,
      [
        orderNumber,
        customerId,
        canonicalSubtotal,
        fromCents(deliveryCents),
        fromCents(taxCents),
        fromCents(discountCents),
        canonicalTotal,
        payment_method,
        payment_reference || null,
        payment_status || (payment_method === 'cash' ? 'pending' : 'paid'),
        'received',
        order_type,
        service_type,
        shiftId,
        req.company_id
      ]
    );

    const order = orderResult.rows[0];

    // Deduct ingredients from inventory based on product composition
    const inventoryDeductionResult = await deductInventoryForOrder(client, items, order.id, req.company_id, order.order_number);

    if (!inventoryDeductionResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: inventoryDeductionResult.error,
        insufficientItems: inventoryDeductionResult.insufficientItems
      });
    }

    // Insert order items
    for (const item of items) {
      const isCombo = item.isCombo || (typeof item.id === 'string' && item.id.startsWith('combo-'));
      let productId = null;
      let comboId = null;

      if (isCombo) {
        // Extract numeric combo ID from "combo-1" format or use direct ID
        comboId = typeof item.id === 'string' && item.id.startsWith('combo-')
          ? parseInt(item.id.replace('combo-', ''))
          : item.id;
      } else {
        productId = item.product_id || item.id;
      }

      await client.query(
        `INSERT INTO order_items (order_id, product_id, combo_id, is_combo, product_name, size_name, quantity, unit_price, subtotal, notes, company_id)
         VALUES ($1::text, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid)`,
        [
          order.id,
          productId,
          comboId,
          isCombo,
          item.name || item.product_name,
          item.selectedSize || item.size_name || null,
          Number(item.quantity || 0),
          fromCents(toCents(item.price || item.unit_price)),
          fromCents(Math.round(Number(item.quantity || 0) * Number(item.price || item.unit_price || 0) * 100)),
          item.notes || null,
          req.company_id
        ]
      );
    }

    // Loyalty Points Earning & Tier-Up Logic
    if (customerId) {
      // Fetch loyalty settings from system_settings
      const settingsRes = await client.query(
        `SELECT key, value FROM system_settings 
             WHERE company_id = $1 AND key LIKE 'loyalty_%'`,
        [req.company_id]
      );
      const settings = {};
      settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

      // Default to 1 point per 50 Php if not set
      const pointsPerPhp = parseFloat(settings.loyalty_points_per_php) || (1 / 50);
      const earnedPoints = Math.floor(canonicalTotal * pointsPerPhp);

      if (earnedPoints > 0) {
        // First get current points to calculate new tier
        const custRes = await client.query('SELECT loyalty_points FROM customers WHERE id = $1', [customerId]);
        if (custRes.rows.length > 0) {
          const currentTotalPoints = (custRes.rows[0].loyalty_points || 0) + earnedPoints;

          // Fetch dynamic thresholds and discounts
          const silverThreshold = parseInt(settings.loyalty_silver_threshold) || 100;
          const silverDiscount = parseFloat(settings.loyalty_silver_discount) || 5;
          const goldThreshold = parseInt(settings.loyalty_gold_threshold) || 500;
          const goldDiscount = parseFloat(settings.loyalty_gold_discount) || 10;
          const diamondThreshold = parseInt(settings.loyalty_diamond_threshold) || 1000;
          const diamondDiscount = parseFloat(settings.loyalty_diamond_discount) || 15;

          let tier = 'Bronze';
          let discount = 0;

          if (currentTotalPoints >= diamondThreshold) {
            tier = 'Diamond';
            discount = diamondDiscount;
          } else if (currentTotalPoints >= goldThreshold) {
            tier = 'Gold';
            discount = goldDiscount;
          } else if (currentTotalPoints >= silverThreshold) {
            tier = 'Silver';
            discount = silverDiscount;
          }

          await client.query(
            `UPDATE customers SET 
                      loyalty_points = loyalty_points + $1, 
                      loyalty_tier = $2,
                      loyalty_discount = $3,
                      updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $4 AND company_id = $5`,
            [earnedPoints, tier, discount, customerId, req.company_id]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      orderNumber: order.order_number,
      order
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// PUT update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status } = req.body;

    const updates = [];
    const params = [];

    if (order_status) {
      params.push(order_status);
      updates.push(`order_status = $${params.length}`);
    }

    if (payment_status) {
      params.push(payment_status);
      updates.push(`payment_status = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    params.push(String(id));
    params.push(String(req.company_id || 'd6797595-412e-4b3b-8378-4442a397d207')); // Safe string casting
    let result;
    try {
      result = await pool.query(
        `UPDATE orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id::text = $${params.length - 1}::text 
         AND (company_id::text = $${params.length}::text OR company_id::text IN ('d6797595-412e-4b3b-8378-4442a397d207', 'e7643a28-bb00-40e5-87cd-15cd4c7457fc')) 
         RETURNING id, order_number, order_status, payment_status, customer_id, service_type, updated_at`,
        params
      );
    } catch (updateErr) {
      // Backward-compat for older schemas that don't have orders.updated_at.
      if (updateErr?.code === '42703' && String(updateErr.message || '').toLowerCase().includes('updated_at')) {
        result = await pool.query(
          `UPDATE orders SET ${updates.join(', ')}
           WHERE id::text = $${params.length - 1}::text 
           AND (company_id::text = $${params.length}::text OR company_id::text IN ('d6797595-412e-4b3b-8378-4442a397d207', 'e7643a28-bb00-40e5-87cd-15cd4c7457fc')) 
           RETURNING id, order_number, order_status, payment_status, customer_id, service_type, created_at`,
          params
        );
      } else {
        throw updateErr;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const updatedOrder = result.rows[0];

    // Send push notification to customer when order is ready
    if (order_status === 'completed' && updatedOrder.customer_id) {
      try {
        const customerResult = await pool.query(
          'SELECT player_id, name FROM customers WHERE id::text = $1::text AND (company_id::text = $2::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
          [updatedOrder.customer_id, req.company_id]
        );
        const customer = customerResult.rows[0];
        if (customer && customer.player_id) {
          const notifResponse = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
            },
            body: JSON.stringify({
              app_id: process.env.ONESIGNAL_APP_ID,
              include_player_ids: [customer.player_id],
              headings: { en: 'Your order is ready!' },
              contents: { en: `Order ${updatedOrder.order_number} is ready for ${updatedOrder.service_type === 'pick-up' ? 'pickup' : 'serving'}. Thank you!` }
            })
          });
          const notifResult = await notifResponse.json();
          console.log('Push notification sent:', notifResult.id || 'sent');
        }
      } catch (notifError) {
        console.error('Error sending push notification:', notifError.message);
      }
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('CRITICAL DATABASE ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'CRITICAL_DB_ERROR: ' + error.message,
      detail: error.detail,
      hint: error.hint
    });
  }
});

// POST void or comp an order item
router.post('/:orderId/items/:itemId/adjust', async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId, itemId } = req.params;
    const { type, reason, created_by } = req.body;

    if (!['void', 'comp'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Type must be void or comp' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }

    await client.query('BEGIN');

    // Get the order item
    const itemResult = await client.query(
      'SELECT * FROM order_items WHERE id::text = $1::text AND order_id::text = $2::text AND (company_id::text = $3::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
      [itemId, orderId, req.company_id]
    );
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Order item not found' });
    }
    const item = itemResult.rows[0];
    if (item.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: `Item is already ${item.status}` });
    }

    // Update item status
    const newStatus = type === 'void' ? 'voided' : 'comped';
    await client.query(
      'UPDATE order_items SET status = $1 WHERE id::text = $2::text AND (company_id::text = $3::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
      [newStatus, itemId, req.company_id]
    );

    await client.query(
      `INSERT INTO order_item_adjustments (order_item_id, order_id, adjustment_type, reason, original_amount, created_by, company_id)
       VALUES ($1, $2::text, $3, $4, $5, $6, $7::uuid)`,
      [itemId, orderId, type, reason.trim(), item.subtotal, created_by || 'POS', req.company_id]
    );

    // Restore stock if voiding
    if (type === 'void' && item.product_id) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND company_id = $3',
        [item.quantity, item.product_id, req.company_id]
      );
    }

    // Recalculate order totals (exclude voided items, comped items count as $0)
    const totalsResult = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN status = 'active' THEN subtotal ELSE 0 END), 0) as subtotal
       FROM order_items WHERE order_id = $1 AND status != 'voided' AND company_id = $2`,
      [orderId, req.company_id]
    );
    const newSubtotal = parseFloat(totalsResult.rows[0].subtotal);
    const newTax = newSubtotal * 0.08; // Assuming 8% tax rate
    const newTotal = newSubtotal + newTax;

    await client.query(
      'UPDATE orders SET subtotal = $1, tax_amount = $2, total_amount = $3 WHERE id::text = $4::text AND (company_id::text = $5::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')',
      [newSubtotal, newTax, newTotal, orderId, req.company_id]
    );

    await client.query('COMMIT');

    // Return updated order with items
    const orderItemsResult = await pool.query('SELECT * FROM order_items WHERE order_id::text = $1::text AND (company_id::text = $2::text OR company_id::text = \'d6797595-412e-4b3b-8378-4442a397d207\')', [orderId, req.company_id]);

    res.json({
      success: true,
      order: { ...itemResult.rows[0], items: orderItemsResult.rows }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting order item:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust order item' });
  } finally {
    client.release();
  }
});

// GET adjustments for an order (audit trail)
router.get('/:id/adjustments', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, oi.product_name, oi.size_name, oi.quantity, oi.unit_price
       FROM order_item_adjustments a
       JOIN order_items oi ON a.order_item_id = oi.id AND a.company_id = oi.company_id
       WHERE a.order_id = $1 AND a.company_id = $2
       ORDER BY a.created_at DESC`,
      [id, req.company_id]
    );
    res.json({ success: true, adjustments: result.rows });
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch adjustments' });
  }
});

export default router;
