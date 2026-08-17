// ============================================================
// Cloud Migration Recommendation API Router
// ============================================================

const express = require('express');
const router = express.Router();
const migrationService = require('../services/migrationService');
const { classifyCloudError } = require('../middleware/errorClassifier');

// 1. GET /api/migration/recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const recs = await migrationService.getRecommendations(req.tenantId);
    res.json(recs);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 2. POST /api/migration/migrate
router.post('/migrate', async (req, res) => {
  try {
    const { recommendationId } = req.body;
    if (!recommendationId) {
      return res.status(400).json({ error: 'recommendationId is required.' });
    }
    const result = await migrationService.startMigrationSimulation(recommendationId, req.tenantId, req.user.email);
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

module.exports = router;
