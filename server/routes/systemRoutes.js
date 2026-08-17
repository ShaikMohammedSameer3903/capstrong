const express = require('express');
const router = express.Router();
const systemChecklistService = require('../services/systemChecklistService');

/**
 * GET /api/system/tools
 * Diagnostic check of CLI tools installed on host machine
 */
router.get('/tools', (req, res) => {
  try {
    const tools = systemChecklistService.checkSystemTools();
    const installedCount = tools.filter(t => t.status === 'INSTALLED').length;
    
    res.json({
      success: true,
      totalCount: tools.length,
      installedCount,
      missingCount: tools.length - installedCount,
      tools
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/deployments/checklist
 * Runs pre-deployment checklist verification for target cloud
 */
router.post('/checklist', async (req, res) => {
  try {
    const { targetCloud = 'azure', namespace = 'default' } = req.body;
    const result = await systemChecklistService.runPreDeploymentChecklist(targetCloud, namespace);
    res.json({
      success: true,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
