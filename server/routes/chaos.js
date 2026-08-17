const express = require('express');
const router = express.Router();
const chaosEngine = require('../services/chaosEngine');

router.post('/experiment', async (req, res) => {
  try {
    const { targetResource, experimentType } = req.body;
    if (!targetResource) {
      return res.status(400).json({ error: 'targetResource is required' });
    }
    const result = await chaosEngine.runExperiment(req.tenantId, targetResource, experimentType);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
