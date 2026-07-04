import express from 'express';
import { runAgent } from '../services/agentScraper.js';

const router = express.Router();

router.post('/trigger', async (req, res) => {
  try {
    const company_id = req.company_id;
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'No company context found' });
    }
    
    // Call the runAgent service
    const result = await runAgent(company_id);
    
    res.json({ success: true, message: result.message, data: result.scrapedData });
  } catch (error) {
    console.error('Agent trigger error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to trigger agent' });
  }
});

export default router;
