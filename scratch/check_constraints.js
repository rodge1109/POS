import pool from '../server/config/database.js';

async function checkConstraints() {
    try {
        const res = await pool.query("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'journal_entries'::regclass");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkConstraints();
