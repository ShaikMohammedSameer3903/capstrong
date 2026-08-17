const express = require('express');
const router = express.Router();
const e2eDemonstrationService = require('../services/e2eDemonstrationService');

router.post('/start', async (req, res) => {
  try {
    const result = await e2eDemonstrationService.startDemonstration(
      req.tenantId,
      req.userEmail,
      req.body
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:workflowId', async (req, res) => {
  try {
    const status = await e2eDemonstrationService.getStatus(req.params.workflowId);
    res.json(status);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
