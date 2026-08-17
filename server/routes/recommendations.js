const express = require('express');
const router = express.Router();
const recommendationEngine = require('../services/recommendationEngine');

// POST /api/recommendations/evaluate - Get smart cloud recommendation
router.post('/evaluate', async (req, res) => {
  try {
    const recommendation = await recommendationEngine.generateRecommendation(req.body);
    res.json({ success: true, data: recommendation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/recommendations/default - Get default recommendation summary
router.get('/default', async (req, res) => {
  try {
    const recommendation = await recommendationEngine.generateRecommendation({});
    res.json({ success: true, data: recommendation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
