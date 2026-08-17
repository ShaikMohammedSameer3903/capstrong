// ============================================================
// Predictive Analytics Engine API Router
// ============================================================

const express = require('express');
const router = express.Router();
const predictiveService = require('../services/predictiveService');
const { classifyCloudError } = require('../middleware/errorClassifier');

// 1. GET /api/predictive/forecast
router.get('/forecast', async (req, res) => {
  try {
    const model = req.query.model || 'xgboost';
    const forecast = await predictiveService.getForecast(req.tenantId, model);
    res.json(forecast);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 2. GET /api/predictive/alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await predictiveService.getAlerts(req.tenantId);
    res.json(alerts);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 3. POST /api/predictive/alerts/:id/resolve
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const result = await predictiveService.resolveAlert(req.params.id, req.tenantId);
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 4. GET /api/predictive/recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const model = req.query.model || 'xgboost';
    const recommendations = await predictiveService.getRecommendations(req.tenantId, model);
    res.json(recommendations);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

module.exports = router;
