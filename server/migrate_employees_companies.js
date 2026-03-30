import pool from './config/database.js';
import crypto from 'crypto';

async function columnExists(table, column) {
  const q = `
    SELECT 1 FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  `;
  const r = await pool.query(q, [table, column]);
  return r.rows.length > 0;
}

async function getColumnType(table, column) {
  const q = `
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  `;
  const r = await pool.query(q, [table, column]);
  return r.rows[0] || null;
}

async function run() {
  try {
    console.log('Starting employees/companies migration...');

    // 1) Ensure companies.login_pin exists (varchar)
    console.log('Ensuring companies.login_pin column exists...');
    await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS login_pin VARCHAR(10)');

    // 2) Ensure employees."PIN" is VARCHAR(6) (preserve leading zeros)
    const pinExists = await columnExists('employees', 'PIN');
    if (!pinExists) {
      console.log('employees."PIN" column not found — creating as VARCHAR(6)');
      await pool.query('ALTER TABLE employees ADD COLUMN "PIN" VARCHAR(6)');
    } else {
      const col = await getColumnType('employees', 'PIN');
      console.log('employees."PIN" current type:', col && (col.data_type || col.udt_name));
      // If it's not character varying / text, alter the type using USING cast
      const isTextLike = col && (col.data_type === 'character varying' || col.data_type === 'text');
      if (!isTextLike) {
        console.log('Altering employees."PIN" to VARCHAR(6) using text cast...');
        await pool.query('ALTER TABLE employees ALTER COLUMN "PIN" TYPE VARCHAR(6) USING ("PIN"::text)');
      } else {
        console.log('employees."PIN" already text-like — ensuring length limit...');
        await pool.query('ALTER TABLE employees ALTER COLUMN "PIN" TYPE VARCHAR(6)');
      }
    }

    // 3) Ensure employees.company_id exists
    const companyIdExists = await columnExists('employees', 'company_id');
    if (!companyIdExists) {
      console.log('Adding employees.company_id (uuid) column...');
      await pool.query('ALTER TABLE employees ADD COLUMN company_id uuid');
    } else {
      console.log('employees.company_id already exists');
    }

    // 4) Ensure a default company exists and assign employees without company_id
    console.log('Ensuring a default company exists and assigning employees to it...');
    // Try to find an existing default-like company
    const found = await pool.query("SELECT id FROM companies WHERE name = 'Default Company' LIMIT 1");
    let defaultCompanyId;
    if (found.rows.length > 0) {
      defaultCompanyId = found.rows[0].id;
      console.log('Found existing Default Company with id', defaultCompanyId);
    } else {
      // Generate a UUID locally and insert company row
      defaultCompanyId = crypto.randomUUID();
      const defaultPin = '000000';
      console.log('Inserting Default Company with id', defaultCompanyId);
      await pool.query(
        `INSERT INTO companies (id, name, login_pin, created_at)
         VALUES ($1, $2, $3, NOW())`
        , [defaultCompanyId, 'Default Company', defaultPin]
      );
    }

    // Update employees with NULL company_id
    const upd = await pool.query(
      'UPDATE employees SET company_id = $1 WHERE company_id IS NULL RETURNING id',
      [defaultCompanyId]
    );
    console.log(`Assigned ${upd.rowCount} employees to default company`);

    // 5) Add FK constraint if not exists
    const fkName = 'employees_company_id_fkey';
    const fkCheck = await pool.query(
      `SELECT 1 FROM pg_constraint WHERE conname = $1 LIMIT 1`,
      [fkName]
    );
    if (fkCheck.rows.length === 0) {
      console.log('Adding foreign key constraint employees.company_id -> companies(id)');
      await pool.query(
        `ALTER TABLE employees
         ADD CONSTRAINT ${fkName}
         FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL`
      );
    } else {
      console.log('Foreign key constraint already exists:', fkName);
    }

    console.log('Migration finished successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  run();
}

export default run;
