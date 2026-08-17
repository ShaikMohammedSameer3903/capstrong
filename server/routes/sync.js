// ============================================================
// Sync Status API Routes
// GET /api/sync/status — Current sync status for all accounts
// GET /api/sync/history — Sync history
// POST /api/sync/:accountId/retry — Retry failed sync
// ============================================================

const express = require('express');
const router = express.Router();
const { getSyncStatusForUser, getSyncHistoryForUser, getSyncHistory } = require('../services/syncStatusService');
const { discoverCloudAccount } = require('../services/discoveryEngine');
const { classifyCloudError } = require('../middleware/errorClassifier');

// GET /api/sync/status
router.get('/status', async (req, res) => {
  try {
    const statuses = await getSyncStatusForUser(req.tenantId, req.userId, req.userRole);
    res.json({
      accounts: statuses,
      summary: {
        total: statuses.length,
        syncing: statuses.filter(s => s.status === 'syncing').length,
        completed: statuses.filter(s => s.status === 'completed').length,
        error: statuses.filter(s => s.status === 'error').length,
        idle: statuses.filter(s => s.status === 'idle').length,
      }
    });
  } catch (err) {
    const classified = classifyCloudError(err, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// GET /api/sync/history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await getSyncHistoryForUser(req.tenantId, req.userId, req.userRole, limit);
    res.json(history);
  } catch (err) {
    const classified = classifyCloudError(err, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// GET /api/sync/:accountId/history
router.get('/:accountId/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await getSyncHistory(req.params.accountId, limit);
    res.json(history);
  } catch (err) {
    const classified = classifyCloudError(err, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// POST /api/sync/:accountId/retry — Retry failed resources
router.post('/:accountId/retry', async (req, res) => {
  try {
    const { accountId } = req.params;
    const userAccessToken = req.azureAccessToken || req.headers['x-azure-token'] || null;

    // Start discovery asynchronously
    discoverCloudAccount(req.tenantId, accountId, userAccessToken)
      .catch(e => console.error(`[SYNC] Retry failed for ${accountId}:`, e.message));

    res.json({ success: true, message: 'Sync retry started asynchronously.' });
  } catch (err) {
    const classified = classifyCloudError(err, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

// POST /api/sync/trigger — Trigger immediate multi-cloud resource discovery scan
router.post('/trigger', async (req, res) => {
  try {
    const { getDatabase } = require('../db/database');
    const { discoverAllResources, discoverAwsAccount, discoverGcpAccount } = require('../services/discoveryEngine');
    const db = await getDatabase();
    
    // 1. Azure Subscriptions
    const subs = await db.all('SELECT * FROM azure_subscriptions');
    for (const sub of subs) {
      try {
        await discoverAllResources(sub.tenant_id, sub.id, null);
      } catch (err) {
        console.warn(`[SYNC] Azure discovery notice for ${sub.name}:`, err.message);
      }
    }

    // 2. AWS Accounts
    const awsAccounts = await db.all("SELECT * FROM cloud_accounts WHERE provider = 'aws' AND status = 'Active'");
    for (const awsAcc of awsAccounts) {
      try {
        await discoverAwsAccount(awsAcc.id);
      } catch (err) {
        console.warn(`[SYNC] AWS discovery notice for ${awsAcc.account_name}:`, err.message);
      }
    }

    // 3. GCP Accounts
    const gcpAccounts = await db.all("SELECT * FROM cloud_accounts WHERE provider = 'gcp' AND status = 'Active'");
    for (const gcpAcc of gcpAccounts) {
      try {
        await discoverGcpAccount(gcpAcc.id);
      } catch (err) {
        console.warn(`[SYNC] GCP discovery notice for ${gcpAcc.account_name}:`, err.message);
      }
    }

    res.json({ success: true, message: 'Multi-cloud resource discovery triggered successfully across Azure, AWS, and GCP.' });
  } catch (err) {
    const classified = classifyCloudError(err, 'unknown');
    res.status(classified.status).json(classified.body);
  }
});

module.exports = router;
