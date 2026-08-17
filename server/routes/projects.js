const express = require('express');
const router = express.Router();
const projectAnalyzer = require('../services/projectAnalyzer');
const { getDatabase } = require('../db/database');
const crypto = require('crypto');

/**
 * POST /api/projects/analyze
 * Automatically analyzes a project directory or default workspace path
 */
router.post('/analyze', async (req, res) => {
  try {
    const { projectPath, tenantId = 'demo-org-001' } = req.body;
    const targetPath = projectPath || process.cwd();

    const analysis = projectAnalyzer.analyzeProject(targetPath);
    const db = await getDatabase();

    const id = `proj-analysis-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    await db.run(`
      INSERT INTO project_analyses (
        id, tenant_id, project_path, framework, language, runtime, build_command, start_command, container_type, deployment_strategy, detected_files, has_dockerfile, has_compose, has_k8s, has_helm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, tenantId, analysis.projectPath, analysis.framework, analysis.language, analysis.runtime,
      analysis.buildCommand, analysis.startCommand, analysis.containerType, analysis.deploymentStrategy,
      JSON.stringify(analysis.detectedFiles),
      analysis.hasDockerfile ? 1 : 0,
      analysis.hasDockerCompose ? 1 : 0,
      analysis.hasK8s ? 1 : 0,
      analysis.hasHelm ? 1 : 0
    ]);

    res.json({
      success: true,
      analysisId: id,
      analysis
    });
  } catch (err) {
    console.error('[Projects API] Analysis failed:', err.message);
    res.status(400).json({
      success: false,
      error: 'Project Analysis Failed',
      message: err.message,
      recommendation: 'Ensure the target directory exists and contains recognizable project manifest files.'
    });
  }
});

/**
 * GET /api/projects/analyses
 * List historical project analyses for tenant
 */
router.get('/analyses', async (req, res) => {
  try {
    const tenantId = req.query.tenantId || req.tenantId || 'demo-org-001';
    const db = await getDatabase();
    const rows = await db.all(`SELECT * FROM project_analyses WHERE tenant_id = ? ORDER BY created_at DESC`, [tenantId]);
    
    res.json({
      success: true,
      count: rows.length,
      analyses: rows.map(r => ({
        ...r,
        detected_files: r.detected_files ? JSON.parse(r.detected_files) : []
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
