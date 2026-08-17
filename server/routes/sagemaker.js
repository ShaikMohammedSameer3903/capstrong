// ============================================================
// AI Optimization SageMaker API Router
// ============================================================

const express = require('express');
const router = express.Router();
const sagemakerService = require('../services/sagemakerService');
const { classifyCloudError } = require('../middleware/errorClassifier');

// 1. POST /api/sagemaker/train
router.post('/train', async (req, res) => {
  const { modelType } = req.body;
  if (!modelType) {
    return res.status(400).json({ error: 'ModelType is required (linear_regression, random_forest, xgboost, kmeans).' });
  }

  try {
    const result = await sagemakerService.trainModels(req.tenantId, modelType);
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 2. POST /api/sagemaker/predict
router.post('/predict', async (req, res) => {
  const { modelType, data } = req.body;
  if (!modelType || !data) {
    return res.status(400).json({ error: 'ModelType and input Data are required.' });
  }

  try {
    const result = await sagemakerService.invokeInference(req.tenantId, { modelType, data });
    res.json(result);
  } catch (error) {
    const classified = classifyCloudError(error, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// 3. POST /api/sagemaker/sagemaker-endpoint/invocations
// Matches the exact contract of the Amazon SageMaker Runtime API post request to /invocations
router.post('/sagemaker-endpoint/invocations', async (req, res) => {
  console.log('[SAGEMAKER ENDPOINT] POST /invocations requested');
  try {
    let payload = req.body;
    
    // Parse body if CSV formatted
    if (req.headers['content-type'] === 'text/csv') {
      const csvStr = req.body.toString();
      const parts = csvStr.split(',').map(p => parseFloat(p.trim()));
      payload = {
        modelType: 'xgboost',
        data: {
          cpu: parts[0] || 50,
          memory: parts[1] || 60,
          cost: parts[2] || 100,
          provider: 'aws'
        }
      };
    }
    
    const result = await sagemakerService.invokeInference(req.tenantId || 'demo-tenant', payload);
    
    // Return contract formatted response
    res.setHeader('X-Amzn-SageMaker-Custom-Header', 'CloudOps-SageMaker-Mock');
    res.json({
      InferenceMode: result.inferenceMode,
      EndpointName: result.endpoint,
      Outputs: {
        CostPrediction: result.predictions.costPrediction,
        PerformancePrediction: result.predictions.performancePrediction,
        MigrationRecommendation: result.predictions.migrationRecommendation,
        Rightsizing: result.predictions.rightsizing,
        ConfidenceScore: result.predictions.confidenceScore
      },
      Timestamp: result.timestamp
    });
  } catch (error) {
    console.error('[SAGEMAKER ENDPOINT ERROR] Invocations failed:', error);
    res.status(500).json({ error: 'SageMaker Invocations failed locally.', details: error.message });
  }
});

module.exports = router;
