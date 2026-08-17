const express = require('express');
const router = express.Router();
const remediationService = require('../services/remediationService');

router.post('/execute', async (req, res) => {
  try {
    const { resourceId, actionType } = req.body;
    if (!resourceId || !actionType) {
      return res.status(400).json({ error: 'resourceId and actionType are required' });
    }
    const result = await remediationService.executeRemediation(req.tenantId, resourceId, actionType);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
