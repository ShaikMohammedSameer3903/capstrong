// ============================================================
// Multi-Cloud Performance Comparison Engine API Router
// ============================================================

const express = require('express');
const router = express.Router();
const performanceEngine = require('../services/performanceEngine');
const { classifyCloudError } = require('../middleware/errorClassifier');

// 1. GET /api/performance/comparison
router.get('/comparison', async (req, res) => {
  try {
    const comparison = await performanceEngine.getComparison(req.tenantId);
    res.json(comparison);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 2. GET /api/performance/trends
router.get('/trends', async (req, res) => {
  try {
    const trends = await performanceEngine.getTrends(req.tenantId);
    res.json(trends);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 3. GET /api/performance/history
router.get('/history', async (req, res) => {
  try {
    const history = await performanceEngine.getHistory(req.tenantId);
    res.json(history);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

module.exports = router;
