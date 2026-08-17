const express = require('express');
const router = express.Router();
const iacEngine = require('../services/iacEngine');

router.post('/generate', (req, res) => {
  try {
    const { format = 'terraform', appSpec = {} } = req.body;
    const template = iacEngine.generateTemplate(format, appSpec);
    res.json({ format, template });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
