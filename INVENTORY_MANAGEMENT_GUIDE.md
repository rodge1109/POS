# Inventory Management System - Setup & Usage Guide

## Overview
This inventory management system allows you to:
- Track raw ingredients/materials used in your restaurant
- Define recipes (Bill of Materials) for each menu item
- Automatically deduct ingredients from inventory when orders are placed
- Monitor inventory levels and receive low-stock alerts
- Track inventory transactions for audit purposes

## Database Tables Created

### 1. `ingredients` table
Stores all raw materials used in the restaurant:
- `id` - Unique identifier
- `name` - Ingredient name
- `unit` - Measurement unit (kg, liters, pieces, grams, etc.)
- `current_stock` - Current quantity in stock
- `reorder_level` - Minimum stock threshold (triggers alerts)
- `supplier` - Supplier name
- `cost_per_unit` - Cost for accounting
- `created_at` / `updated_at` - Timestamps

### 2. `product_composition` table
Defines recipes (which ingredients go into each product):
- `product_id` - References products table
- `ingredient_id` - References ingredients table
- `quantity_required` - Amount of ingredient needed per 1 unit of product

### 3. `inventory_transactions` table
Audit trail of all inventory movements:
- `ingredient_id` - Which ingredient
- `transaction_type` - 'order_deduction', 'purchase', 'adjustment', 'waste'
- `quantity_change` - Amount changed (negative for deductions)
- `quantity_after` - Stock level after transaction
- `reference_id` - Order ID (for order deductions)
- `reference_type` - Type of reference ('order', etc.)
- `created_by` - Who made the change

## API Endpoints

### Ingredients Management
- **GET** `/api/inventory/ingredients` - Get all ingredients
- **GET** `/api/inventory/ingredients/low-stock` - Get low stock alerts
- **GET** `/api/inventory/ingredients/:id` - Get single ingredient
- **POST** `/api/inventory/ingredients` - Create new ingredient
- **PUT** `/api/inventory/ingredients/:id` - Update ingredient

### Inventory Transactions
- **POST** `/api/inventory/inventory/adjust` - Make manual adjustment
- **GET** `/api/inventory/inventory/transactions/:ingredientId` - Get transaction history

### Recipe Management
- **GET** `/api/inventory/recipes` - Get all products with recipe info
- **GET** `/api/inventory/recipes/:productId` - Get recipe for a product
- **POST** `/api/inventory/recipes/:productId/ingredients` - Add ingredient to recipe
- **DELETE** `/api/inventory/recipes/:productId/ingredients/:ingredientId` - Remove ingredient from recipe

### Inventory Status
- **GET** `/api/inventory/status` - Get complete inventory status
- **GET** `/api/inventory/analytics` - Get usage analytics

## Setup Steps

### 1. Database Initialization
The inventory tables should already be created by running:
```bash
node server/add-inventory-management.js
```

If not already run, execute it now:
```bash
cd /path/to/restaurant-ordering-system
node server/add-inventory-management.js
```

### 2. Sample Ingredients
The following ingredients are pre-populated:
- Burger Bun (pieces)
- Beef Patty (pieces)
- Cheese (kg)
- Lettuce (kg)
- Tomato (kg)
- Onion (kg)
- Rice (kg)
- Chicken Breast (kg)
- Cooking Oil (liters)
- Salt (kg)

You can add more ingredients through the Admin > Inventory > Ingredients panel.

### 3. Define Product Recipes
For each menu item, define which ingredients it needs:

**Example: Hamburger Recipe**
1. Go to Admin > Inventory > Recipes
2. Click on "Hamburger"
3. Add ingredients:
   - Burger Bun: 1 piece
   - Beef Patty: 1 piece
   - Cheese: 0.05 kg
   - Lettuce: 0.05 kg
   - Tomato: 0.05 kg

**Example: Fried Chicken**
1. Click on "Fried Chicken"
2. Add ingredients:
   - Chicken Breast: 0.3 kg
   - Cooking Oil: 0.5 liters (shared across multiple items, will accumulate)
   - Salt: 0.01 kg

## How It Works

### When an Order is Placed
1. Customer orders: 2 Hamburgers + 1 Fried Chicken
2. System checks ingredients needed:
   - Burger Bun: 2 pieces
   - Beef Patty: 2 pieces
   - Cheese: 0.1 kg
   - Lettuce: 0.1 kg
   - Tomato: 0.1 kg
   - Chicken Breast: 0.3 kg
   - Cooking Oil: 0.5 liters
   - Salt: 0.01 kg
3. System verifies all ingredients are in stock
4. If OK: Order is created AND ingredients are automatically deducted
5. If NOT: Order fails with message showing which ingredients are insufficient
6. All changes are recorded in `inventory_transactions` table

### Low Stock Alerts
- Whenever ingredient stock falls below or equals the reorder level, it's flagged as "LOW STOCK"
- Dashboard shows count of low-stock items
- Inventory Status page lists all items needing reordering

## Using the Inventory System - Admin Panel

### Ingredients Tab
- **View all ingredients** with current stock levels
- **Status indicator** showing if stock is OK or LOW
- **Add new ingredient** - Click "+ Add Ingredient" button
  - Enter: Name, Unit, Initial Stock, Reorder Level, Cost/Unit
- **Adjust stock** - Click "Adjust" button for an ingredient
  - Enter quantity change (positive to add, negative to remove)
  - Optional notes (e.g., "Damaged in shipment", "Stock received",checked)

### Recipes Tab
- **View all products** and their ingredient requirements
- **Click a product** to expand and see its ingredients
- **No ingredients defined?** You'll see a message to add some
- **Add ingredient to recipe**:
  - Click "+ Add Ingredient" in the expanded recipe
  - Enter Ingredient ID (from Ingredients tab) and Quantity needed

### Status Tab
- **Total Items** - Total different ingredients in system
- **Low Stock Count** - How many ingredients need reordering
- **Inventory Value** - Total monetary value of all stock (for accounting)
- **Low Stock Alerts** - List of all items below reorder level with current/needed amounts

## Important Best Practices

1. **Define recipes BEFORE orders**
   - Products without recipes defined won't have automatic inventory deduction
   - Manual orders might still process, but ingredients won't be tracked

2. **Regular inventory counts**
   - Use "Adjust" feature to correct counts after physical inventory verification
   - Record reasons in notes for audit trail

3. **Reorder levels**
   - Set to maintain buffer stock (e.g., 1-2 days of typical usage)
   - Too low = risk of stockouts
   - Too high = excess cash tied up in inventory

4. **Cost tracking**
   - Update ingredient costs when supplier prices change
   - Use for inventory valuation (shown in Status tab)

5. **Monitor transactions**
   - Check transactions history for unusual patterns
   - Investigate large unexplained deductions

## Troubleshooting

### Orders failing with "insufficient stock"
- Check ingredient levels in Ingredients tab
- Verify product recipes are correctly defined
- Check if ingredients are actually in the system (not typos)

### Missing inventory transactions
- Transactions only record order deductions, manual adjustments, and waste
- Each transaction linked to Order ID for traceability

### Low stock alerts not showing
- Check "reorder_level" value for each ingredient
- Ensure current_stock is actually below this level
- Refresh the page

## Example Workflow

### Initial Setup
```
1. Admin adds all ingredients to system:
   - Rice: 50 kg, Reorder at 10 kg, ₱40/kg
   - Chicken: 15 kg, Reorder at 3 kg, ₱250/kg
   - Vegetables: 20 kg, Reorder at 5 kg, ₱60/kg

2. Admin defines recipes for each menu item:
   - Chicken Rice: 0.25 kg chicken + 0.2 kg rice + 0.1 kg vegetables
   - Vegetable Rice: 0.3 kg rice + 0.2 kg vegetables

3. Initial inventory value: ₱4,480
```

### Daily Operations
```
1. Morning: Check Inventory Status tab
   - See if any items need ordering

2. Receive new stock:
   - Adjust Rice from 50 to 70 kg (added 20)
   - Notes: "Weekly delivery from supplier X"

3. Throughout day:
   - Customers place orders
   - Ingredients automatically deducted
   - Transactions recorded automatically

4. End of day:
   - Review transactions
   - Check current stock
   - Note low-stock items for next order

5. Physical count (weekly):
   - Count actual ingredients
   - Use Adjust to correct any discrepancies
   - Record reason in notes
```

## Dashboard Integration
The dashboard also shows:
- **Low Stock count** in the main dashboard cards
- Alerts linking to Inventory> page for quick access

## API Usage Examples

### Check Inventory Status
```javascript
fetch('http://localhost:5000/api/inventory/status')
  .then(r => r.json())
  .then(data => {
    console.log('Total items:', data.summary.total_items);
    console.log('Low stock count:', data.summary.low_stock_count);
    console.log('Inventory value:', data.summary.total_inventory_value);
  });
```

### Get Ingredient Details
```javascript
fetch('http://localhost:5000/api/inventory/ingredients/1')
  .then(r => r.json())
  .then(data => console.log(data.ingredient));
```

### Adjust Inventory
```javascript
fetch('http://localhost:5000/api/inventory/inventory/adjust', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ingredient_id: 1,
    quantity_change: -5,
    notes: 'Damage during storage'
  })
})
.then(r => r.json())
.then(data => console.log(data));
```

### Get Recipe for Product
```javascript
fetch('http://localhost:5000/api/inventory/recipes/5')
  .then(r => r.json())
  .then(data => console.log(data.recipe));
```

## Support
For issues or questions about the inventory system:
1. Check the API response messages for specific errors
2. Review transaction history for expected movements
3. Verify ingredient and product IDs match between tabs
4. Ensure recipes are properly defined before placing orders
