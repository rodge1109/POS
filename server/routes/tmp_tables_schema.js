import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  const res = await client.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'employees'");
  console.log('--- EMPLOYEES SCHEMA ---');
  console.log(JSON.stringify(res.rows, null, 2));
  client.release();
  await pool.end();
}
check();
