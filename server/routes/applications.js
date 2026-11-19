const express = require('express');
const router = express.Router();
const applicationService = require('../services/applicationService');
const projectAnalyzer = require('../services/projectAnalyzer');

// Middleware to enforce authentication
function requireAuth(req, res, next) {
  if (!req.tenantId || !req.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing tenant or user context.' });
  }
  next();
}

// POST /api/applications/analyze-repo - Auto-dictate and inspect Git repository
router.post('/analyze-repo', async (req, res) => {
  try {
    const { repositoryUrl } = req.body;
    if (!repositoryUrl || !repositoryUrl.trim()) {
      return res.status(400).json({ success: false, error: 'Repository URL is required.' });
    }

    console.log(`[Applications] Analyzing repository: ${repositoryUrl}`);
    const analysis = await projectAnalyzer.analyzeGitRepository(repositoryUrl);
    res.json({ success: true, data: analysis });
  } catch (err) {
    console.error('[Applications] Repo analysis error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/applications - List all applications in Application Catalog
router.get('/', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const isAdmin = true;

    const apps = await applicationService.getApplications(tenantId, userId, isAdmin);
    res.json({ success: true, count: apps.length, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/applications/:id - Get single application details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const app = await applicationService.getApplicationById(req.params.id, req.tenantId);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found' });
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/applications - Create new application
router.post('/', requireAuth, async (req, res) => {
  try {
    const app = await applicationService.createApplication(req.tenantId, req.userId, req.body);
    res.status(201).json({ success: true, data: app });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/applications/:id - Edit application
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const app = await applicationService.updateApplication(req.params.id, req.tenantId, req.body);
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/applications/:id - Delete application
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await applicationService.deleteApplication(req.params.id, req.tenantId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
