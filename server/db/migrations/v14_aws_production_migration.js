// ============================================================
// V14 AWS Real Production Deployment & Account Lifespan Migration
// Idempotent & Non-Destructive — Compatible with SQLite & PostgreSQL
// ============================================================

const { getDatabase } = require('../database');

async function runV14Migration() {
  const db = await getDatabase();
  console.log('[MIGRATION] Running V14 AWS Production Deployment & Account Lifespan Migration...');

  // 1. Column additions for cloud_accounts
  const cloudAccountColumns = [
    { column: 'session_token', type: 'TEXT' },
    { column: 'connected_at', type: 'DATETIME' },
    { column: 'expires_at', type: 'DATETIME' }
  ];

  for (const c of cloudAccountColumns) {
    try {
      await db.run(`ALTER TABLE cloud_accounts ADD COLUMN ${c.column} ${c.type}`);
      console.log(`[MIGRATION] Added column cloud_accounts.${c.column}`);
    } catch (err) {
      if (!err.message.includes('duplicate') && !err.message.includes('already exists')) {
        console.warn(`[MIGRATION] Notice on cloud_accounts.${c.column}: ${err.message}`);
      }
    }
  }

  // 2. Column additions for deployments
  const deploymentColumns = [
    { column: 'pipeline_stage', type: 'TEXT DEFAULT "PENDING"' },
    { column: 's3_bucket', type: 'TEXT' },
    { column: 'cloudfront_distribution_id', type: 'TEXT' },
    { column: 'cloudfront_domain', type: 'TEXT' },
    { column: 'aws_region', type: 'TEXT' },
    { column: 'operation_id', type: 'TEXT' },
    { column: 'rollback_version', type: 'TEXT' },
    { column: 'previous_deployment_id', type: 'TEXT' },
    { column: 'build_artifact_path', type: 'TEXT' }
  ];

  for (const c of deploymentColumns) {
    try {
      await db.run(`ALTER TABLE deployments ADD COLUMN ${c.column} ${c.type}`);
      console.log(`[MIGRATION] Added column deployments.${c.column}`);
    } catch (err) {
      if (!err.message.includes('duplicate') && !err.message.includes('already exists')) {
        console.warn(`[MIGRATION] Notice on deployments.${c.column}: ${err.message}`);
      }
    }
  }

  // 3. For SQLite: widen status check constraint on deployments table if needed
  if (!process.env.DATABASE_URL) {
    try {
      const tableInfo = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='deployments'");
      if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('DEPLOYED')) {
        console.log('[MIGRATION] Widening deployments status CHECK constraint to include real AWS pipeline states...');
        // Create new table with expanded status values
        await db.run('PRAGMA foreign_keys = OFF;');
        await db.run(`
          CREATE TABLE IF NOT EXISTS deployments_v14 (
            id TEXT PRIMARY KEY,
            application_id TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            user_id TEXT,
            target_cloud TEXT NOT NULL,
            deployment_type TEXT DEFAULT 'Docker',
            version TEXT DEFAULT '1.0.0',
            status TEXT NOT NULL DEFAULT 'Queued',
            trigger_type TEXT DEFAULT 'Manual',
            endpoint_url TEXT,
            resource_id TEXT,
            duration_ms INTEGER DEFAULT 0,
            error_message TEXT,
            deployed_by TEXT,
            pipeline_stage TEXT DEFAULT 'PENDING',
            s3_bucket TEXT,
            cloudfront_distribution_id TEXT,
            cloudfront_domain TEXT,
            aws_region TEXT,
            operation_id TEXT,
            rollback_version TEXT,
            previous_deployment_id TEXT,
            build_artifact_path TEXT,
            organization_id TEXT,
            git_commit_sha TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
            FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
          );
        `);
        await db.run(`
          INSERT OR IGNORE INTO deployments_v14 (
            id, application_id, tenant_id, user_id, target_cloud, deployment_type, version, status,
            trigger_type, endpoint_url, resource_id, duration_ms, error_message, deployed_by,
            organization_id, git_commit_sha, created_at, updated_at
          )
          SELECT 
            id, application_id, tenant_id, user_id, target_cloud, deployment_type, version, status,
            trigger_type, endpoint_url, resource_id, duration_ms, error_message, deployed_by,
            organization_id, git_commit_sha, created_at, updated_at
          FROM deployments;
        `);
        await db.run('DROP TABLE deployments;');
        await db.run('ALTER TABLE deployments_v14 RENAME TO deployments;');
        await db.run('CREATE INDEX IF NOT EXISTS idx_deployments_app_tenant ON deployments(application_id, tenant_id);');
        await db.run('PRAGMA foreign_keys = ON;');
        console.log('[MIGRATION] Successfully widened deployments table schema.');
      }
    } catch (migErr) {
      console.warn('[MIGRATION] deployments table expansion notice:', migErr.message);
      try { await db.run('PRAGMA foreign_keys = ON;'); } catch (_) {}
    }
  }

  // 4. Initialize existing active cloud accounts with 5-hour window if not set
  try {
    const fiveHoursFromNow = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    await db.run(`
      UPDATE cloud_accounts
      SET connected_at = datetime('now'),
          expires_at = ?
      WHERE (expires_at IS NULL OR expires_at = '') AND status IN ('Active', 'Enabled')
    `, [fiveHoursFromNow]);
  } catch (err) {
    console.warn('[MIGRATION] Notice initializing expires_at for cloud_accounts:', err.message);
  }

  console.log('[MIGRATION] V14 migration completed successfully.');
}

module.exports = { runV14Migration };
