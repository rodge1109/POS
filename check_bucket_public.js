import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const dbUrl = process.env.DATABASE_URL || '';
const match = dbUrl.match(/postgres\.([a-z0-9-]+):/i);
const supabaseUrl = process.env.SUPABASE_URL || (match ? `https://${match[1]}.supabase.co` : '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

async function checkBucket() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase config');
    return;
  }
  
  try {
    const res = await axios.get(`${supabaseUrl}/storage/v1/bucket/product-images`, {
      headers: { 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('Bucket details:', res.data);
    if (!res.data.public) {
      console.log('Bucket is PRIVATE. Updating to PUBLIC...');
      await axios.put(`${supabaseUrl}/storage/v1/bucket/product-images`, {
        public: true
      }, {
        headers: { 'Authorization': `Bearer ${supabaseKey}` }
      });
      console.log('Bucket is now PUBLIC.');
    } else {
      console.log('Bucket is already PUBLIC.');
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkBucket();
