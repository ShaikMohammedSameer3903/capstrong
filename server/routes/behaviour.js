const express = require('express');
const router = express.Router();
const comparisonEngine = require('../services/comparisonEngine');

// GET /api/behaviour/comparison - Get behaviour comparison matrix across Azure, AWS, GCP
router.get('/comparison', async (req, res) => {
  try {
    const data = await comparisonEngine.getBehaviourComparison(req.tenantId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
