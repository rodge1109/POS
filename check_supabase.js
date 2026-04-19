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
    console.error('Missing Supabase config. Check your .env file.');
    console.log('SUPABASE_KEY exists?', !!supabaseKey);
    console.log('DATABASE_URL exists?', !!dbUrl);
    return;
  }

  console.log('Testing Supabase URL:', supabaseUrl);
  
  try {
    const res = await axios.get(`${supabaseUrl}/storage/v1/bucket`, {
      headers: { 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('Available buckets:', res.data.map(b => b.name));
    
    const hasProductBucket = res.data.some(b => b.name === 'product-images');
    if (!hasProductBucket) {
      console.log('Bucket "product-images" NOT FOUND. Creating it...');
      try {
        const createRes = await axios.post(`${supabaseUrl}/storage/v1/bucket`, {
          id: 'product-images',
          name: 'product-images',
          public: true,
          file_size_limit: 5242880,
          allowed_mime_types: ["image/*"]
        }, {
          headers: { 'Authorization': `Bearer ${supabaseKey}` }
        });
        console.log('Bucket created successfully!');
      } catch (e) {
        console.error('Failed to create bucket:', e.response?.data || e.message);
      }
    } else {
      console.log('Bucket "product-images" already exists.');
    }
  } catch (error) {
    console.error('Error checking buckets:', error.response?.data || error.message);
  }
}

checkBucket();
