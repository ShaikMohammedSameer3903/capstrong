// ============================================================
// Cloud Migration Recommendation & Simulation Engine Service
// Cross-Cloud Resource Profiling (Azure <-> AWS <-> GCP)
// ============================================================

const { getDatabase } = require('../db/database');
const operationService = require('./operationService');

/**
 * Maps source instances to candidate instance sizing in target clouds
 */
const PROVIDER_SPEC_MAPS = {
  azure: {
    standard_b2s: { cpu: 2, memory: 4, storage: 40, price: 32.40, name: 'Standard B2s' },
    standard_d2s_v5: { cpu: 2, memory: 8, storage: 80, price: 74.20, name: 'Standard D2s v5' },
    standard_d4s_v5: { cpu: 4, memory: 16, storage: 150, price: 148.40, name: 'Standard D4s v5' }
  },
  aws: {
    t3_medium: { cpu: 2, memory: 4, storage: 40, price: 34.10, name: 't3.medium' },
    m5_large: { cpu: 2, memory: 8, storage: 80, price: 78.40, name: 'm5.large' },
    m5_xlarge: { cpu: 4, memory: 16, storage: 150, price: 156.80, name: 'm5.xlarge' }
  },
  gcp: {
    e2_medium: { cpu: 2, memory: 4, storage: 40, price: 28.20, name: 'e2-medium' },
    e2_standard_2: { cpu: 2, memory: 8, storage: 80, price: 67.80, name: 'e2-standard-2' },
    e2_standard_4: { cpu: 4, memory: 16, storage: 150, price: 134.10, name: 'e2-standard-4' }
  }
};

async function ensureRecommendationsSeeded(tenantId) {
  const db = await getDatabase();
  const countRow = await db.get('SELECT COUNT(*) as count FROM migration_recommendations WHERE tenant_id = ?', [tenantId]);

  if (countRow && countRow.count > 0) {
    return;
  }

  // Fetch tenant real discovered resources
  const resources = await db.all('SELECT id, name, provider, type, cost_impact FROM resources WHERE tenant_id = ?', [tenantId]);
  
  if (!resources || resources.length === 0) {
    return; // No real resources discovered yet — return empty list
  }

  // Iterate over real discovered resources and evaluate cross-cloud migration options
  for (const res of resources) {
    const srcProv = (res.provider || 'Azure').toLowerCase();
    let targetProv = 'aws';
    if (srcProv === 'aws') targetProv = 'gcp';
    else if (srcProv === 'gcp') targetProv = 'azure';

    let cpu = 2;
    let memory = 8;
    let storage = 80;
    let srcPrice = res.cost_impact || 75.00;
    let targetPrice = srcPrice * 0.88;

    if (srcPrice > 100) {
      cpu = 4;
      memory = 16;
      storage = 150;
      targetPrice = targetProv === 'gcp' ? 134.10 : targetProv === 'aws' ? 156.80 : 148.40;
    } else if (srcPrice < 50) {
      cpu = 2;
      memory = 4;
      storage = 40;
      targetPrice = targetProv === 'gcp' ? 28.20 : targetProv === 'aws' ? 34.10 : 32.40;
    } else {
      targetPrice = targetProv === 'gcp' ? 67.80 : targetProv === 'aws' ? 78.40 : 74.20;
    }

    const estimatedSavings = parseFloat((srcPrice - targetPrice).toFixed(2));
    let perfImpr = targetProv === 'gcp' ? 15 : targetProv === 'aws' ? 18 : 10;
    let downtime = storage * 0.015;
    let risk = Math.round((storage > 100 ? 45 : 25) + (srcProv === 'azure' ? 10 : 5));
    let confidence = Math.round(98 - (risk * 0.3));
    const migrationCost = parseFloat((storage * 0.12 + 15).toFixed(2));

    const recId = `mig-rec-${res.id}`;
    await db.run(`
      INSERT OR IGNORE INTO migration_recommendations (
        id, tenant_id, resource_id, resource_name, source_provider, target_provider,
        cpu, memory, storage, source_price, target_price, migration_cost,
        migration_risk, estimated_savings, performance_improvement, downtime, confidence_score, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `, [
      recId,
      tenantId,
      res.id,
      res.name,
      res.provider,
      targetProv.toUpperCase(),
      cpu,
      memory,
      storage,
      srcPrice,
      targetPrice,
      migrationCost,
      risk,
      estimatedSavings,
      perfImpr,
      parseFloat(downtime.toFixed(1)),
      confidence
    ]);
  }
}

/**
 * Get active recommendations
 */
async function getRecommendations(tenantId) {
  const db = await getDatabase();
  await ensureRecommendationsSeeded(tenantId);
  return await db.all(`
    SELECT * FROM migration_recommendations
    WHERE tenant_id = ? AND status != "Dismissed"
    ORDER BY estimated_savings DESC
  `, [tenantId]);
}

/**
 * Simulates the migration transfer pipeline asynchronously
 */
async function startMigrationSimulation(recommendationId, tenantId, userEmail) {
  const db = await getDatabase();
  const rec = await db.get('SELECT * FROM migration_recommendations WHERE id = ? AND tenant_id = ?', [recommendationId, tenantId]);

  if (!rec) {
    throw new Error('Migration recommendation not found.');
  }

  // Create telemetry operation record
  const operationId = `mig-op-${recommendationId}`;
  await operationService.createOperation({
    id: operationId,
    name: `Migration: ${rec.resource_name} (${rec.source_provider} → ${rec.target_provider})`,
    stage: 'Initializing transfer pipeline',
    percent: 5,
    time_remaining: '25m',
    status: 'Running',
    user_email: userEmail,
    tenant_id: tenantId
  });

  // Run simulation logging asynchronous task
  const runTask = async () => {
    try {
      const logs = [
        { pct: 15, msg: 'Creating full snapshot backups of source storage volumes...', delay: 2500 },
        { pct: 35, msg: 'Provisioning secure cross-cloud migration network transfer tunnels...', delay: 3000 },
        { pct: 60, msg: `Transferring disk images (${rec.storage} GB) to target registry...`, delay: 4000 },
        { pct: 85, msg: `Provisioning matching compute VM specs (${rec.cpu} Core, ${rec.memory} GB RAM) in target provider region...`, delay: 3000 },
        { pct: 95, msg: 'Conducting final health checks and performing DNS swap validation...', delay: 2000 },
        { pct: 100, msg: `Migration transfer pipeline completed. Target virtual instances are running successfully.`, delay: 1000 }
      ];

      for (const log of logs) {
        await new Promise(resolve => setTimeout(resolve, log.delay));
        await operationService.addLog(operationId, log.msg);
        await db.run('UPDATE operations SET percent = ?, stage = ? WHERE id = ?', [log.pct, log.msg, operationId]);
      }

      // Update source resource provider in DB to reflect completed migration
      await db.run('UPDATE resources SET provider = ?, cost_impact = ? WHERE id = ?', [rec.target_provider, rec.target_price, rec.resource_id]);
      
      // Update recommendation status
      await db.run('UPDATE migration_recommendations SET status = "Migrated" WHERE id = ?', [recommendationId]);

      // Complete operation
      await db.run('UPDATE operations SET status = "Succeeded", percent = 100, stage = "Completed migration successfully" WHERE id = ?', [operationId]);
      
      // Log event to audit logs
      await db.run(`
        INSERT INTO audit_logs (tenant_id, user_id, user_email, provider, action, resource_type, resource_id, details)
        VALUES (?, "system", ?, ?, "Cross-Cloud Migration Applied", "Virtual Machine", ?, ?)
      `, [
        tenantId,
        userEmail,
        rec.source_provider,
        rec.resource_id,
        JSON.stringify({
          source: rec.source_provider,
          target: rec.target_provider,
          savings: rec.estimated_savings,
          downtime: rec.downtime
        })
      ]);

      console.log(`[MIGRATION SUCCESS] Finished simulating migration: ${recommendationId}`);
    } catch (err) {
      console.error('[MIGRATION FAILURE] Error in simulation:', err);
      await operationService.addLog(operationId, `CRITICAL FAILURE: ${err.message}`);
      await db.run('UPDATE operations SET status = "Failed", stage = "Failed migration transfer pipeline" WHERE id = ?', [operationId]);
    }
  };

  // Launch task in background
  runTask();

  return { operationId };
}

module.exports = {
  getRecommendations,
  startMigrationSimulation
};
