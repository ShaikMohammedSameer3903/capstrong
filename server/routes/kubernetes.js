const express = require('express');
const router = express.Router();
const k8sService = require('../services/k8sService');

router.get('/cluster', async (req, res) => {
  try {
    const summary = await k8sService.getClusterSummary(req.tenantId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
