const express = require('express');
const router = express.Router();
const portabilityEngine = require('../services/portabilityEngine');

// GET /api/portability/summary - Get summary portability report
router.get('/summary', async (req, res) => {
  try {
    const summary = await portabilityEngine.getPortabilitySummary(req.tenantId);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/portability/analyze - Trigger portability evaluation for app
router.post('/analyze', async (req, res) => {
  try {
    const applicationId = req.body.applicationId;
    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'applicationId is required.' });
    }
    const report = await portabilityEngine.analyzePortability(applicationId, req.tenantId);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
