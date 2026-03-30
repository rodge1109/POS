import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkAdmin() {
  try {
    // Check if admin exists
    const result = await pool.query("SELECT * FROM employees WHERE username = 'admin'");

    if (result.rows.length === 0) {
      console.log('Admin user does NOT exist! Creating...');

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);

      await pool.query(
        `INSERT INTO employees (username, password_hash, name, role)
         VALUES ($1, $2, $3, $4)`,
        ['admin', passwordHash, 'Administrator', 'admin']
      );
      console.log('Admin user created! Username: admin, Password: admin123');
    } else {
      console.log('Admin user exists:');
      console.log('  ID:', result.rows[0].id);
      console.log('  Username:', result.rows[0].username);
      console.log('  Name:', result.rows[0].name);
      console.log('  Role:', result.rows[0].role);
      console.log('  Active:', result.rows[0].active);

      // Test password
      const isValid = await bcrypt.compare('admin123', result.rows[0].password_hash);
      console.log('  Password "admin123" valid:', isValid);

      if (!isValid) {
        console.log('\nResetting password to admin123...');
        const newHash = await bcrypt.hash('admin123', 10);
        await pool.query(
          "UPDATE employees SET password_hash = $1 WHERE username = 'admin'",
          [newHash]
        );
        console.log('Password reset successfully!');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAdmin();
