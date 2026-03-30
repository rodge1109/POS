import pool from './server/config/database.js';

async function migrate() {
  try {
    // 1. Add column
    await pool.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS login_pin VARCHAR(10) UNIQUE DEFAULT NULL');
    
    // 2. Clear all existing PINs to avoid collision during update
    await pool.query('UPDATE companies SET login_pin = NULL');
    console.log('Cleared all PINs');

    // 3. Assign unique PINs
    const res = await pool.query('SELECT id, name FROM companies ORDER BY name');
    for (let i = 0; i < res.rows.length; i++) {
       let finalPin;
       if (res.rows[i].name === 'KEANU LUGAWAN') {
         finalPin = '111111';
       } else {
         // Generate Pins like 100001, 100002, etc. and avoid 111111
         let offset = i + 1;
         if (offset >= 111111) offset++; // Extreme edge case
         finalPin = (100000 + offset).toString();
         if (finalPin === '111111') finalPin = '100000'; // Specific check
       }

      await pool.query('UPDATE companies SET login_pin = $1 WHERE id = $2', [finalPin, res.rows[i].id]);
      console.log(`Set PIN for ${res.rows[i].name} to ${finalPin}`);
    }
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
