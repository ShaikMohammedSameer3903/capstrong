const express = require('express');
const router = express.Router();
const deploymentService = require('../services/deploymentService');
const eventBus = require('../services/eventBus');
const { getDatabase } = require('../db/database');

// Middleware to enforce authentication on mutation routes
function requireAuth(req, res, next) {
  if (!req.tenantId || !req.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing tenant or user context.' });
  }
  next();
}

// GET /api/deployments/cloud223-evidence - Fetch evidence records & negative-test results
router.get('/cloud223-evidence', requireAuth, async (req, res) => {
  try {
    const evidenceWriter = require('../services/evidenceWriter');
    const runs = await evidenceWriter.list();
    res.json({ success: true, count: runs.length, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/deployments - List all deployments
router.get('/', requireAuth, async (req, res) => {
  try {
    const deployments = await deploymentService.getDeployments(req.tenantId);
    res.json({ success: true, count: deployments.length, data: deployments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/dry-run - Validate deployment specs & AWS connection before deployment
router.post('/dry-run', requireAuth, async (req, res) => {
  try {
    const { applicationId, targetCloud, region, environment } = req.body;
    if (!applicationId || !targetCloud) {
      return res.status(400).json({ success: false, error: 'applicationId and targetCloud are required for dry-run.' });
    }

    const dryRunResult = await deploymentService.dryRunDeployment(req.tenantId, req.userId, applicationId, targetCloud, region, environment);
    res.json({ success: true, data: dryRunResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/deployments/:id - Get deployment details, logs, metrics
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const deployment = await deploymentService.getDeploymentById(req.params.id, req.tenantId);
    if (!deployment) return res.status(404).json({ success: false, error: 'Deployment not found' });
    res.json({ success: true, data: deployment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/deployments/:id/logs - Get deployment logs specifically
router.get('/:id/logs', requireAuth, async (req, res) => {
  try {
    const db = await getDatabase();
    const logs = await db.all(`SELECT * FROM deployment_logs WHERE deployment_id = ? ORDER BY id ASC`, [req.params.id]);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/deployments/:id/resources - Get deployed resources for deployment
router.get('/:id/resources', requireAuth, async (req, res) => {
  try {
    const db = await getDatabase();
    const deployment = await db.get(`SELECT * FROM deployments WHERE id = ? AND tenant_id = ?`, [req.params.id, req.tenantId]);
    if (!deployment) return res.status(404).json({ success: false, error: 'Deployment not found' });

    const resources = await db.all(`
      SELECT * FROM resources 
      WHERE tenant_id = ? AND (id = ? OR tags LIKE ?)
    `, [req.tenantId, deployment.resource_id || '', `%${req.params.id}%`]);

    res.json({ success: true, count: resources.length, data: resources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/deployments/:id/events - Server-Sent Events (SSE) stream for real-time logs & events
router.get('/:id/events', requireAuth, async (req, res) => {
  const deploymentId = req.params.id;

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', deploymentId, timestamp: new Date().toISOString() })}\n\n`);

  // Listener for live log entries
  const onLogEvent = (logEntry) => {
    res.write(`data: ${JSON.stringify({ type: 'log', data: logEntry })}\n\n`);
  };

  // Listener for status updates
  const onStatusEvent = (statusUpdate) => {
    res.write(`data: ${JSON.stringify({ type: 'status', data: statusUpdate })}\n\n`);
  };

  eventBus.on(`deployment_log_${deploymentId}`, onLogEvent);
  eventBus.on(`deployment_status_${deploymentId}`, onStatusEvent);

  // Send initial existing logs if any
  try {
    const db = await getDatabase();
    const existingLogs = await db.all(`SELECT * FROM deployment_logs WHERE deployment_id = ? ORDER BY id ASC`, [deploymentId]);
    for (const log of existingLogs) {
      res.write(`data: ${JSON.stringify({ type: 'log', data: log })}\n\n`);
    }
  } catch (e) {}

  req.on('close', () => {
    eventBus.removeListener(`deployment_log_${deploymentId}`, onLogEvent);
    eventBus.removeListener(`deployment_status_${deploymentId}`, onStatusEvent);
  });
});

// POST /api/deployments - Deploy application to target cloud
router.post('/', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const userDisplayName = req.userEmail || 'Platform Admin';
    const { applicationId, targetCloud, region, environment, deploymentType } = req.body;

    if (!applicationId || !targetCloud) {
      return res.status(400).json({ success: false, error: 'applicationId and targetCloud are required.' });
    }

    const userAzureToken = req.headers['x-azure-token'] || req.azureAccessToken || req.body?.accessToken || null;
    const deployment = await deploymentService.deployApplication(tenantId, userId, applicationId, targetCloud, userDisplayName, { region, environment, deploymentType, userAzureToken });
    
    if (deployment.status === 'Failed') {
      return res.status(500).json({ success: false, error: deployment.error_message || 'Deployment execution failed.', data: deployment });
    }

    res.status(201).json({ success: true, data: deployment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/rollback - Rollback deployment
router.post('/:id/rollback', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.rollbackDeployment(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/retry - Retry deployment
router.post('/:id/retry', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.retryDeployment(req.params.id, req.tenantId, req.userId, req.userEmail);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/cancel - Cancel deployment
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.cancelDeployment(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/deployments/:id - Delete deployment & teardown CloudFormation infrastructure
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.deleteDeployment(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/restart - Restart deployment
router.post('/:id/restart', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.restartDeployment(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/terminate - Terminate deployment
router.post('/:id/terminate', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.terminateDeployment(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/scale - Scale deployment replicas
router.post('/:id/scale', requireAuth, async (req, res) => {
  try {
    const { replicas } = req.body;
    const result = await deploymentService.scaleDeployment(req.params.id, req.tenantId, replicas);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/pause - Pause deployment
router.post('/:id/pause', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.pauseDeployment(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deployments/:id/resume - Resume deployment
router.post('/:id/resume', requireAuth, async (req, res) => {
  try {
    const result = await deploymentService.resumeDeployment(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/deployments/manifests/:applicationId - Get generated Dockerfile & K8s manifests
router.get('/manifests/:applicationId', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'demo-org-001';
    const result = await deploymentService.getDeploymentManifests(req.params.applicationId, tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
