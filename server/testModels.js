import pool from './config/database.js';

async function run() {
  const res = await pool.query("SELECT value FROM system_settings WHERE key='agent_gemini_api_key' LIMIT 1");
  if (!res.rows.length || !res.rows[0].value) { console.log('No API key in DB'); process.exit(1); }
  const apiKey = res.rows[0].value;
  console.log('Got API key');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;
  const modelsRes = await fetch(url);
  const modelsData = await modelsRes.json();
  if (modelsData.models) {
    console.log(JSON.stringify(modelsData.models.map(m => m.name), null, 2));
  } else {
    console.log(modelsData);
  }
  process.exit(0);
}
run().catch(console.error);
