import pool from '../server/config/database.js';

async function checkJournal() {
    try {
        const res = await pool.query("SELECT id, transaction_date, description, reference_no, source_module FROM journal_entries ORDER BY id DESC LIMIT 10");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkJournal();
