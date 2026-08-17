// ============================================================
// Enterprise FinOps Command Center API Router
// ============================================================

const express = require('express');
const router = express.Router();
const finopsService = require('../services/finopsService');
const { classifyCloudError } = require('../middleware/errorClassifier');

// 1. GET /api/finops/summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await finopsService.getSummary(req.tenantId);
    res.json(summary);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 2. GET /api/finops/breakdown
router.get('/breakdown', async (req, res) => {
  try {
    const breakdowns = await finopsService.getBreakdowns(req.tenantId);
    res.json(breakdowns);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 3. GET /api/finops/wastes
router.get('/wastes', async (req, res) => {
  try {
    const wastes = await finopsService.getWastes(req.tenantId);
    res.json(wastes);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 4. GET /api/finops/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await finopsService.getSuggestions(req.tenantId);
    res.json(suggestions);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 5. GET /api/finops/alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await finopsService.getAlerts(req.tenantId);
    res.json(alerts);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 6. POST /api/finops/alerts/:id/resolve
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const result = await finopsService.resolveAlert(req.params.id, req.tenantId);
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

module.exports = router;
