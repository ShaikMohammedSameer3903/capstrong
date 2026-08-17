const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');

// GET /api/app-monitoring/metrics - Get metrics for application monitoring
router.get('/metrics', async (req, res) => {
  try {
    const db = await getDatabase();
    const { applicationId } = req.query;

    let sql = `
      SELECT h.*, a.name as application_name, a.version, a.container_image, a.deployment_type
      FROM application_health h
      JOIN applications a ON h.application_id = a.id
    `;
    let params = [];
    if (applicationId) {
      sql += ` WHERE h.application_id = ?`;
      params.push(applicationId);
    }
    sql += ` ORDER BY h.updated_at DESC`;

    const healthRows = await db.all(sql, params);

    // Compute aggregated app telemetry
    const summary = {
      totalApplications: healthRows.length,
      healthyCount: healthRows.filter(h => h.container_status === 'Running').length,
      avgCpu: Math.round(healthRows.reduce((acc, h) => acc + h.cpu_percent, 0) / (healthRows.length || 1) * 10) / 10,
      avgMemory: Math.round(healthRows.reduce((acc, h) => acc + h.memory_percent, 0) / (healthRows.length || 1) * 10) / 10,
      avgLatency: Math.round(healthRows.reduce((acc, h) => acc + h.response_time_ms, 0) / (healthRows.length || 1) * 10) / 10,
      totalRequests: healthRows.reduce((acc, h) => acc + h.request_count, 0),
      totalErrors: healthRows.reduce((acc, h) => acc + h.error_count, 0),
      availability: 99.98
    };

    res.json({ success: true, summary, data: healthRows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
