const express = require('express');
const router = express.Router();
const recoveryEngine = require('../services/recoveryEngine');

// GET /api/recovery/metrics - Get Disaster Recovery metrics comparing Azure vs AWS vs GCP
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await recoveryEngine.getRecoveryMetrics(req.tenantId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
