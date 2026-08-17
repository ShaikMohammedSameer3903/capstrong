// ============================================================
// Compliance Center & Optimization Score Engine API Router
// ============================================================

const express = require('express');
const router = express.Router();
const complianceService = require('../services/complianceService');
const { classifyCloudError } = require('../middleware/errorClassifier');

// 1. GET /api/compliance/scores
router.get('/scores', async (req, res) => {
  try {
    const scores = await complianceService.getScores(req.tenantId);
    res.json(scores);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 2. GET /api/compliance/iso27017
router.get('/iso27017', async (req, res) => {
  try {
    const data = await complianceService.getComplianceData(req.tenantId);
    res.json(data);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 3. POST /api/compliance/policies/:id/remediate
router.post('/policies/:id/remediate', async (req, res) => {
  try {
    const result = await complianceService.remediatePolicy(req.params.id, req.tenantId);
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

module.exports = router;
