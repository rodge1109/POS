import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * POST /api/upload
 * Uploads an image to Supabase Storage. 
 * Supports both base64 and standard file buffers.
 */
router.post('/', async (req, res) => {
  try {
    const { fileName, fileData, contentType } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, error: 'Missing file data' });
    }

    const inferSupabaseUrlFromDb = () => {
      const dbUrl = process.env.DATABASE_URL || '';
      const match = dbUrl.match(/postgres\.([a-z0-9-]+):/i);
      return match ? `https://${match[1]}.supabase.co` : '';
    };

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || inferSupabaseUrlFromDb();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    // Clean base64 data if it includes a data URL prefix
    const base64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const resolvedContentType = contentType || 'image/png';
    const buffer = Buffer.from(base64, 'base64');

    // Strict mode: uploads must be stored in Supabase Storage.
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        success: false,
        error: 'Supabase storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server .env'
      });
    }

    // Create a unique filename to avoid collisions
    const bucketName = 'product-images';
    const filePath = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;

    const response = await axios.post(uploadUrl, buffer, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': resolvedContentType,
        'x-upsert': 'true'
      }
    });

    if (![200, 201].includes(response.status)) {
      throw new Error(response.data.message || 'Upload failed');
    }

    // Construct the public URL
    // Format: https://[ref].supabase.co/storage/v1/object/public/[bucket]/[path]
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;

    res.json({
      success: true,
      url: publicUrl,
      path: filePath
    });

  } catch (error) {
    console.error('Upload error details:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Upload failed: ' + (error.response?.data?.message || error.message) 
    });
  }
});

export default router;
