import pool from '../server/config/database.js';
pool.query('SELECT NOW()')
  .then(r => console.log('DB SUCCESS:', r.rows[0]))
  .catch(e => console.error('DB ERROR:', e.message))
  .finally(() => pool.end());
