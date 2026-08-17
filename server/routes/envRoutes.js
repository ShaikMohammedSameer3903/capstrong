const express = require('express');
const router = express.Router();
const envManager = require('../services/envManager');

/**
 * GET /api/env/status
 * Returns current environment variables health and diagnostic information
 */
router.get('/status', async (req, res) => {
  try {
    const tenantId = req.query.tenantId || req.tenantId || 'demo-org-001';
    const validation = await envManager.syncEnvToDatabase(tenantId);
    
    res.json({
      success: true,
      isValid: validation.isValid,
      missingCount: validation.results.filter(r => r.status === 'MISSING').length,
      variables: validation.results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/env/generate
 * Auto-generates missing environment configuration files (.env, .env.example, .env.local, etc.)
 */
router.post('/generate', (req, res) => {
  try {
    envManager.ensureEnvFiles(process.cwd());
    res.json({
      success: true,
      message: 'Successfully generated environment configuration files (.env.example, .env.local, .env.development, .env.production, .env).'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
