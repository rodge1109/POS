/**
 * Inventory Management Helper Service
 * Handles deduction of ingredients from inventory when orders are placed
 */

import pool from '../config/database.js';

/**
 * Deduct ingredients from inventory based on ordered products
 * This function handles both regular products and combos
 * @param {Object} client - Database client (from transaction)
 * @param {Array} items - Array of order items {product_id, id, quantity, isCombo, combo_id}
 * @param {number} orderId - Order ID for tracking
 * @param {string} companyId - Company ID for tenant isolation
 * @returns {Object} { success: boolean, error?: string, deducted: Array }
 */
export const deductInventoryForOrder = async (client, items, orderId, companyId) => {
  try {
    const deductedItems = [];
    const insufficientStockItems = [];

    for (const item of items) {
      const isCombo = item.isCombo || (typeof item.id === 'string' && item.id.startsWith('combo-'));
      let productCompositions = [];
      const productId = item.product_id || item.id;

      if (isCombo) {
        const comboId = typeof item.id === 'string' && item.id.startsWith('combo-')
          ? parseInt(item.id.replace('combo-', ''))
          : item.id;

        const comboItemsResult = await client.query(
          'SELECT product_id, quantity FROM combo_items WHERE combo_id = $1 AND company_id = $2',
          [comboId, companyId]
        );

        for (const comboItem of comboItemsResult.rows) {
          const compositionResult = await client.query(
            'SELECT ingredient_id, quantity_required FROM product_composition WHERE product_id = $1 AND company_id = $2',
            [comboItem.product_id, companyId]
          );
          for (const comp of compositionResult.rows) {
            productCompositions.push({
              ingredient_id: comp.ingredient_id,
              quantity: comp.quantity_required * comboItem.quantity * item.quantity
            });
          }
        }
      } else {
        // Find composition - prioritize size-specific recipe, fallback to global product recipe
        const orderedSizeId = item.size_id || item.product_size_id || null;
        
        let compositionResult;
        if (orderedSizeId) {
          compositionResult = await client.query(
            `SELECT ingredient_id, quantity_required FROM product_composition 
             WHERE product_id = $1 AND company_id = $2 AND size_id = $3`,
            [productId, companyId, orderedSizeId]
          );
        }

        // If no size-specific recipe or no size provided, check for general recipe
        if (!compositionResult || compositionResult.rows.length === 0) {
          compositionResult = await client.query(
            `SELECT ingredient_id, quantity_required FROM product_composition 
             WHERE product_id = $1 AND company_id = $2 AND size_id IS NULL`,
            [productId, companyId]
          );
        }

        for (const comp of compositionResult.rows) {
          productCompositions.push({
            ingredient_id: comp.ingredient_id,
            quantity: comp.quantity_required * item.quantity,
            size_id: orderedSizeId
          });
        }
      }

      // ─── PART A: Ingredient Validation ───
      if (productCompositions.length > 0) {
        for (const comp of productCompositions) {
          const ingredientResult = await client.query(
            'SELECT current_stock, name FROM ingredients WHERE id = $1 AND company_id = $2',
            [comp.ingredient_id, companyId]
          );

          if (ingredientResult.rows.length > 0) {
            const ingredient = ingredientResult.rows[0];
            if (ingredient.current_stock < comp.quantity) {
              insufficientStockItems.push({
                ingredient: ingredient.name,
                required: comp.quantity,
                available: ingredient.current_stock
              });
            }
          }
        }
      } 
      // ─── PART B: Direct Product Stock Validation (For non-recipe items like Bottled Drinks) ───
      else if (!isCombo) {
        const productResult = await client.query(
          'SELECT stock_quantity, name FROM products WHERE id = $1 AND company_id = $2',
          [productId, companyId]
        );
        if (productResult.rows.length > 0) {
          const product = productResult.rows[0];
          if (product.stock_quantity < item.quantity) {
            insufficientStockItems.push({
              ingredient: product.name,
              required: item.quantity,
              available: product.stock_quantity
            });
          }
        }
      }

      if (insufficientStockItems.length > 0) {
        return {
          success: false,
          error: `Insufficient stock for: ${insufficientStockItems.map(i => `${i.ingredient} (need ${i.required}, have ${i.available})`).join(', ')}`,
          insufficientItems: insufficientStockItems
        };
      }

      // ─── PART C: Ingredient Deduction ───
      for (const comp of productCompositions) {
        const updateResult = await client.query(
          `UPDATE ingredients 
           SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND company_id = $3
           RETURNING current_stock, name`,
          [comp.quantity, comp.ingredient_id, companyId]
        );

        if (updateResult.rows.length > 0) {
          await client.query(
            `INSERT INTO inventory_transactions 
             (ingredient_id, product_id, transaction_type, quantity_change, quantity_after, reference_id, reference_type, created_by, company_id, size_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [comp.ingredient_id, productId, 'order_deduction', -comp.quantity, updateResult.rows[0].current_stock, orderId, 'order', 'system', companyId, comp.size_id]
          );

          deductedItems.push({
            ingredient: updateResult.rows[0].name,
            quantity_deducted: comp.quantity,
            remaining_stock: updateResult.rows[0].current_stock
          });
        }
      }

      // ─── PART D: Direct Product Deduction (Only if no recipe exists) ───
      if (productCompositions.length === 0 && !isCombo) {
        const updateResult = await client.query(
          `UPDATE products 
           SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND company_id = $3
           RETURNING stock_quantity, name`,
          [item.quantity, productId, companyId]
        );

        if (updateResult.rows.length > 0) {
          // Record in central inventory ledger using the new product_id column
          await client.query(
            `INSERT INTO inventory_transactions 
             (product_id, transaction_type, quantity_change, quantity_after, reference_id, reference_type, notes, created_by, company_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              productId, 
              'product_deduction', 
              -item.quantity, 
              updateResult.rows[0].stock_quantity, 
              orderId, 
              'order', 
              'Direct product sale (No recipe)', 
              'system', 
              companyId
            ]
          );

          deductedItems.push({
            ingredient: updateResult.rows[0].name,
            quantity_deducted: item.quantity,
            remaining_stock: updateResult.rows[0].stock_quantity
          });
        }
      }
    }

    return { success: true, deducted: deductedItems };
  } catch (error) {
    console.error('Error deducting inventory:', error);
    return {
      success: false,
      error: 'Failed to deduct inventory: ' + error.message
    };
  }
};

/**
 * Get low stock ingredients
 * @returns {Promise<Array>} Array of ingredients below reorder level
 */
export const getLowStockIngredients = async (companyId) => {
  try {
    const result = await pool.query(`
      SELECT id, name, unit, current_stock, reorder_level
      FROM ingredients
      WHERE current_stock <= reorder_level AND company_id = $1
      ORDER BY current_stock ASC
    `, [companyId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting low stock ingredients:', error);
    return [];
  }
};

/**
 * Check if an order can be fulfilled based on ingredient availability
 * @param {Array} items - Array of order items
 * @param {string} companyId - Company ID for tenant isolation
 * @returns {Promise<Object>} { canFulfill: boolean, insufficientItems: Array }
 */
export const checkInventoryAvailability = async (items, companyId) => {
  try {
    const insufficientItems = [];
    for (const item of items) {
      const isCombo = item.isCombo || (typeof item.id === 'string' && item.id.startsWith('combo-'));
      let productCompositions = [];
      const productId = item.product_id || item.id;

      if (isCombo) {
        const comboId = typeof item.id === 'string' && item.id.startsWith('combo-')
          ? parseInt(item.id.replace('combo-', ''))
          : item.id;

        const comboItemsResult = await pool.query(
          'SELECT product_id, quantity FROM combo_items WHERE combo_id = $1 AND company_id = $2',
          [comboId, companyId]
        );

        for (const comboItem of comboItemsResult.rows) {
          const compositionResult = await pool.query(
            'SELECT ingredient_id, quantity_required FROM product_composition WHERE product_id = $1 AND company_id = $2',
            [comboItem.product_id, companyId]
          );
          for (const comp of compositionResult.rows) {
            productCompositions.push({
              ingredient_id: comp.ingredient_id,
              quantity: comp.quantity_required * comboItem.quantity * item.quantity
            });
          }
        }
      } else {
        // Find composition - prioritize size-specific recipe, fallback to global product recipe
        const orderedSizeId = item.size_id || item.product_size_id || null;
        
        let compositionResult;
        if (orderedSizeId) {
          compositionResult = await pool.query(
            `SELECT ingredient_id, quantity_required FROM product_composition 
             WHERE product_id = $1 AND company_id = $2 AND size_id = $3`,
            [productId, companyId, orderedSizeId]
          );
        }

        // If no size-specific recipe or no size provided, check for general recipe
        if (!compositionResult || compositionResult.rows.length === 0) {
          compositionResult = await pool.query(
            `SELECT ingredient_id, quantity_required FROM product_composition 
             WHERE product_id = $1 AND company_id = $2 AND size_id IS NULL`,
            [productId, companyId]
          );
        }

        for (const comp of compositionResult.rows) {
          productCompositions.push({
            ingredient_id: comp.ingredient_id,
            quantity: comp.quantity_required * item.quantity
          });
        }
      }

      // ─── PART A: Ingredient Availability Check ───
      if (productCompositions.length > 0) {
        for (const comp of productCompositions) {
          const ingredientResult = await pool.query(
            'SELECT current_stock, name FROM ingredients WHERE id = $1 AND company_id = $2',
            [comp.ingredient_id, companyId]
          );

          if (ingredientResult.rows.length > 0) {
            const ingredient = ingredientResult.rows[0];
            if (ingredient.current_stock < comp.quantity) {
              insufficientItems.push({
                ingredient: ingredient.name,
                required: comp.quantity,
                available: ingredient.current_stock
              });
            }
          }
        }
      } 
      // ─── PART B: Product Stock Availability Check (For Direct Sales Items) ───
      else if (!isCombo) {
        const productResult = await pool.query(
          'SELECT stock_quantity, name FROM products WHERE id = $1 AND company_id = $2',
          [productId, companyId]
        );
        if (productResult.rows.length > 0) {
          const product = productResult.rows[0];
          if (product.stock_quantity < item.quantity) {
            insufficientItems.push({
              ingredient: product.name,
              required: item.quantity,
              available: product.stock_quantity
            });
          }
        }
      }
    }

    return {
      canFulfill: insufficientItems.length === 0,
      insufficientItems
    };
  } catch (error) {
    console.error('Error checking inventory availability:', error);
    return {
      canFulfill: false,
      insufficientItems: [{ error: error.message }]
    };
  }
};
