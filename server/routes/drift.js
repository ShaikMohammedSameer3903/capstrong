const express = require('express');
const router = express.Router();
const driftEngine = require('../services/driftEngine');

router.get('/', async (req, res) => {
  try {
    const report = await driftEngine.detectDrift(req.tenantId, req.query.cloudAccountId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const report = await driftEngine.detectDrift(req.tenantId, req.body.cloudAccountId, req.body.iacState);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
