const express = require('express');
const router = express.Router();
const slaService = require('../services/slaService');

router.get('/metrics', async (req, res) => {
  try {
    const metrics = await slaService.getSLAMetrics(req.tenantId);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
