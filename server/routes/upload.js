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

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Supabase storage not configured' });
    }

    // Clean base64 data if it includes a data URL prefix
    const base64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64, 'base64');

    // Create a unique filename to avoid collisions
    const bucketName = 'product-images';
    const filePath = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;

    const response = await axios.post(uploadUrl, buffer, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': contentType || 'image/png',
        'x-upsert': 'true'
      }
    });

    if (response.status !== 200) {
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
