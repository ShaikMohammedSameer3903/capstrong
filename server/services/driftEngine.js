// ============================================================
// Enterprise Infrastructure Drift Detection Engine
// Compares IaC State (Terraform / ARM / Bicep) vs Live Discovered Resources
// Identifies Missing, Extra, and Modified Infrastructure Properties
// ============================================================

const { getDatabase } = require('../db/database');

class DriftEngine {
  /**
   * Run drift detection for a tenant or cloud account
   * @param {string} tenantId
   * @param {string} cloudAccountId
   * @param {object} iacState — Optional target IaC manifest or Terraform state object
   */
  async detectDrift(tenantId, cloudAccountId = null, iacState = null) {
    const db = await getDatabase();

    // Query discovered live resources
    let query = `SELECT * FROM resources WHERE tenant_id = ?`;
    const params = [tenantId];
    if (cloudAccountId) {
      query += ` AND (cloud_account_id = ? OR subscription_id = ?)`;
      params.push(cloudAccountId, cloudAccountId);
    }

    const liveResources = await db.all(query, params);

    // Baseline defined infrastructure from database or provided iacState
    const definedResources = iacState?.resources || liveResources.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      location: r.location || r.region,
      expectedStatus: 'Running',
      tags: r.tags ? JSON.parse(r.tags) : {}
    }));

    const liveMap = new Map(liveResources.map(r => [r.id || r.name, r]));
    const definedMap = new Map(definedResources.map(r => [r.id || r.name, r]));

    const missingResources = [];
    const extraResources = [];
    const modifiedResources = [];

    // Check defined vs live
    for (const [id, def] of definedMap.entries()) {
      const live = liveMap.get(id);
      if (!live) {
        missingResources.push({
          id,
          name: def.name,
          type: def.type,
          reason: 'Defined in IaC state but missing in live cloud'
        });
      } else {
        // Compare status and tags for modification drift
        const tagDrift = JSON.stringify(def.tags || {}) !== JSON.stringify(live.tags ? JSON.parse(live.tags) : {});
        const statusDrift = def.expectedStatus && live.status && def.expectedStatus.toLowerCase() !== live.status.toLowerCase();

        if (tagDrift || statusDrift) {
          modifiedResources.push({
            id,
            name: def.name,
            type: def.type,
            changes: [
              ...(tagDrift ? [{ property: 'tags', expected: def.tags, actual: live.tags }] : []),
              ...(statusDrift ? [{ property: 'status', expected: def.expectedStatus, actual: live.status }] : [])
            ]
          });
        }
      }
    }

    // Check live vs defined (extra unmanaged resources)
    for (const [id, live] of liveMap.entries()) {
      if (!definedMap.has(id)) {
        extraResources.push({
          id,
          name: live.name,
          type: live.type,
          reason: 'Unmanaged resource discovered in live cloud (not in IaC state)'
        });
      }
    }

    const totalDrift = missingResources.length + extraResources.length + modifiedResources.length;
    const driftScore = liveResources.length > 0 ? Math.max(0, Math.round(100 - (totalDrift / liveResources.length) * 100)) : 100;

    const report = {
      tenantId,
      cloudAccountId,
      evaluatedAt: new Date().toISOString(),
      liveCount: liveResources.length,
      definedCount: definedResources.length,
      driftScore,
      summary: {
        missingCount: missingResources.length,
        extraCount: extraResources.length,
        modifiedCount: modifiedResources.length,
        hasDrift: totalDrift > 0
      },
      details: {
        missing: missingResources,
        extra: extraResources,
        modified: modifiedResources
      }
    };

    // Store report in audit log
    await db.run(`
      INSERT INTO audit_logs (tenant_id, user_id, user_email, action, resource_type, resource_id, details)
      VALUES (?, 'system', 'drift-engine@cloudops.internal', 'DRIFT_SCAN_COMPLETED', 'InfrastructureDrift', ?, ?)
    `, [tenantId, cloudAccountId || 'all', JSON.stringify({ driftScore, totalDrift })]);

    return report;
  }
}

module.exports = new DriftEngine();
