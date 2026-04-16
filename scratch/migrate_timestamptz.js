import pool from '../server/config/database.js';

async function migrate() {
  try {
    console.log('🚀 Starting Timezone Standardisation Migration (Resilient Version)...');
    
    const tables = [
      { name: 'orders', columns: ['created_at', 'served_at', 'updated_at', 'order_date'] },
      { name: 'shifts', columns: ['start_time', 'end_time', 'created_at'] },
      { name: 'order_items', columns: ['created_at'] },
      { name: 'inventory_transactions', columns: ['created_at'] },
      { name: 'customers', columns: ['created_at', 'updated_at'] },
      { name: 'customer_ledger', columns: ['created_at'] },
      { name: 'products', columns: ['created_at', 'updated_at'] },
      { name: 'combos', columns: ['created_at', 'updated_at'] },
      { name: 'modifiers', columns: ['created_at', 'updated_at'] },
      { name: 'tables', columns: ['created_at', 'updated_at'] },
      { name: 'system_settings', columns: ['updated_at'] },
      { name: 'journal_entries', columns: ['transaction_date', 'created_at'] },
      { name: 'expenses', columns: ['date_incurred', 'created_at'] }
    ];

    for (const table of tables) {
      for (const column of table.columns) {
        const sql = `
          DO $$ 
          BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = '${table.name}' 
                       AND column_name = '${column}') THEN
              EXECUTE 'ALTER TABLE public.${table.name} ALTER COLUMN ${column} TYPE TIMESTAMP WITH TIME ZONE';
              RAISE NOTICE 'Updated ${table.name}.${column} to TIMESTAMPTZ';
            END IF;
          END $$;
        `;
        await pool.query(sql);
      }
    }

    console.log('✅ Migration successful!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
