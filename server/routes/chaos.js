const express = require('express');
const router = express.Router();
const chaosEngine = require('../services/chaosEngine');

// ── Run a single chaos experiment ──
router.post('/experiment', async (req, res) => {
  try {
    const { targetResource, experimentType, partition, provider, intensity } = req.body;
    if (!targetResource) {
      return res.status(400).json({ error: 'targetResource is required' });
    }
    const result = await chaosEngine.runExperiment(
      req.tenantId, targetResource, experimentType,
      { partition, provider, intensity }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Run a randomized chaos experiment (dynamic, randomized workload) ──
router.post('/randomized', async (req, res) => {
  try {
    const { targetResource, excludeTypes, partition, provider } = req.body;
    if (!targetResource) {
      return res.status(400).json({ error: 'targetResource is required' });
    }
    const result = await chaosEngine.runRandomizedWorkload(
      req.tenantId, targetResource,
      { excludeTypes, partition, provider }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Run a chaos campaign (multiple randomized experiments) ──
router.post('/campaign', async (req, res) => {
  try {
    const { targetResource, rounds, intervalMs, excludeTypes, sequential, partition, provider } = req.body;
    if (!targetResource) {
      return res.status(400).json({ error: 'targetResource is required' });
    }
    const result = await chaosEngine.runCampaign(
      req.tenantId, targetResource,
      { rounds, intervalMs, excludeTypes, sequential, partition, provider }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List all supported fault types ──
router.get('/fault-types', (req, res) => {
  try {
    const faultTypes = chaosEngine.getSupportedFaultTypes();
    res.json({
      total: faultTypes.length,
      faultTypes,
      categories: [...new Set(faultTypes.map(ft => ft.category))],
      severities: [...new Set(faultTypes.map(ft => ft.severity))]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get experiment history ──
router.get('/history', async (req, res) => {
  try {
    const partition = req.query.partition || undefined;
    const history = await chaosEngine.getExperimentHistory(partition);
    res.json({
      total: history.length,
      experiments: history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

