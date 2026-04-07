
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const envFile = fs.readFileSync('c:/website/pos-system/.env', 'utf8');
const connectionString = envFile.match(/DATABASE_URL=(.*)/)[1].trim();
const pool = new Pool({ connectionString });

async function checkTZ() {
  try {
    const res = await pool.query(`SHOW timezone`);
    console.table(res.rows);

    const timeRes = await pool.query(`SELECT now(), localtimestamp`);
    console.table(timeRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkTZ();
