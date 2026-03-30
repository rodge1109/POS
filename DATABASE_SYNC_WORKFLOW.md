# Database Sync Workflow Guide

## Overview
This guide shows how to safely sync schema changes from local PostgreSQL to Supabase without losing data.

---

## Scenario 1: Adding a New Table Locally

### Step 1: Create Table in Local PostgreSQL
```sql
-- Example: Create a new 'reviews' table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Export Updated Schema
Run the batch file to export the updated schema:
```
update_schema.bat
```
This updates `server/schema.sql` with the new table automatically.

### Step 3: Extract Only the New Table
Open `server/schema.sql` and copy ONLY the new table definition and its constraints.

**Do NOT copy the DROP TABLE statements at the top!**

### Step 4: Run in Supabase SQL Editor
Paste the new table definition into Supabase SQL Editor:
```sql
CREATE TABLE public.reviews (
    id integer NOT NULL,
    order_id integer,
    rating integer,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Add constraints, indexes, foreign keys
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
CREATE INDEX idx_reviews_order_id ON public.reviews USING btree (order_id);
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
```

**Result**: New table is added to Supabase, all existing data preserved ✓

---

## Scenario 2: Adding a Column to Existing Table

### Step 1: Alter Table Locally
```sql
-- Example: Add column to products table
ALTER TABLE products ADD COLUMN supplier_id INTEGER;
ALTER TABLE products ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
```

### Step 2: Export Updated Schema
```
update_schema.bat
```

### Step 3: Extract the ALTER Statement
From `server/schema.sql`, find and copy the new column definition:
```sql
ALTER TABLE public.products ADD COLUMN supplier_id integer;
ALTER TABLE public.products ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
```

### Step 4: Run in Supabase SQL Editor
Paste the ALTER statement (no DROP TABLE!):
```sql
ALTER TABLE products ADD COLUMN supplier_id INTEGER;
ALTER TABLE products ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
```

**Result**: Column added, all existing product data intact ✓

---

## Scenario 3: Complete Fresh Sync (Delete All Data)

Use this only if you want to reset Supabase and don't mind losing data.

### Step 1: Copy Full schema.sql
Copy the entire contents of `server/schema.sql` (it has DROP TABLE at top)

### Step 2: Run in Supabase SQL Editor
Paste everything and execute.

**WARNING**: This deletes all data in Supabase! Only use for:
- Initial setup (what we did)
- Testing/development
- Complete reset

---

## Workflow Decision Tree

```
Does your Supabase have data you need to keep?
│
├─ YES → Use Scenario 1 or 2 (incremental changes)
│        Extract ONLY the new/changed parts from schema.sql
│        Copy to Supabase SQL Editor
│        ✓ Data preserved
│
└─ NO → Use Scenario 3 (full sync)
        Copy entire schema.sql (with DROP TABLE)
        Paste into Supabase SQL Editor
        ✓ Clean slate
```

---

## Best Practices

1. **Always test locally first**
   - Create table/column in local PostgreSQL
   - Verify it works with your backend
   - Then sync to Supabase

2. **Keep schema.sql updated**
   - Run `update_schema.bat` after any local schema changes
   - Commit to version control (if using git)
   - This maintains source of truth

3. **Document what you're syncing**
   - Before syncing to Supabase, note what changed
   - Example: "Adding 'reviews' table + indexes"

4. **Backup before major changes**
   - If Supabase has important data, export it first
   - Use Supabase dashboard → SQL Editor → Export

---

## Files Reference

| File | Purpose | When to Use |
|------|---------|------------|
| `update_schema.bat` | Export local schema to schema.sql | After any local table/column changes |
| `server/schema.sql` | Complete schema with DROP statements | Full reset of Supabase |
| `migration_supabase.sql` | Incremental updates (template) | Manual data-preserving syncs |

---

## Quick Checklists

### Adding a New Table
- [ ] Create table in local PostgreSQL
- [ ] Run `update_schema.bat`
- [ ] Find new table in `server/schema.sql`
- [ ] Copy table definition + constraints from schema.sql
- [ ] Paste into Supabase SQL Editor
- [ ] Test that table exists in Supabase

### Adding a New Column
- [ ] Alter table locally: `ALTER TABLE ... ADD COLUMN ...`
- [ ] Run `update_schema.bat`
- [ ] Copy the ALTER statement from schema.sql
- [ ] Paste into Supabase SQL Editor
- [ ] Verify column appears in Supabase

### Full Sync (Delete All Data)
- [ ] Backup any important Supabase data (optional)
- [ ] Copy entire `server/schema.sql`
- [ ] Paste into Supabase SQL Editor
- [ ] Verify all tables exist and are empty

---

## Troubleshooting

**Error: "relation already exists"**
- You're trying to CREATE a table that already exists
- Use ALTER TABLE to modify existing tables instead
- Or use the DROP CASCADE approach for full reset

**Error: "foreign key constraint fails"**
- Table you're referencing doesn't exist in Supabase
- Create referenced table first, then create the table with foreign key

**Column not appearing in Supabase**
- Refresh Supabase dashboard
- Check column was properly ALTERed (no errors in SQL output)
- Verify syntax matches the Supabase PostgreSQL dialect

---

## Summary

**Local-Only Development**: Use full `schema.sql` with DROP CASCADE
**Preserving Production Data**: Extract specific changes and sync incrementally
**Source of Truth**: Always keep `server/schema.sql` updated via `update_schema.bat`
