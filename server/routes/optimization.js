// ============================================================
// AI Optimization Center API Router
// ============================================================

const express = require('express');
const router = express.Router();
const optimizationService = require('../services/optimizationService');
const { classifyCloudError } = require('../middleware/errorClassifier');

// 1. GET /api/optimization/summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await optimizationService.getSummary(req.tenantId);
    res.json(summary);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 2. GET /api/optimization/recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await optimizationService.getRecommendations(req.tenantId);
    res.json(recommendations);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 3. GET /api/optimization/forecasts
router.get('/forecasts', async (req, res) => {
  try {
    const forecasts = await optimizationService.getForecasts(req.tenantId);
    res.json(forecasts);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 4. POST /api/optimization/apply
router.post('/apply', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Recommendation ID is required.' });
  }

  try {
    const result = await optimizationService.applyRecommendation(req.tenantId, id, req.userEmail);
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 5. POST /api/optimization/dismiss
router.post('/dismiss', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Recommendation ID is required.' });
  }

  try {
    const result = await optimizationService.dismissRecommendation(req.tenantId, id);
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

module.exports = router;
