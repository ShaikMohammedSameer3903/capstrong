// ============================================================
// V13 Enterprise Migration Script — Multi-Tenancy, Security, Audit, Drift, Chaos, SLA
// Idempotent & Non-Destructive — Compatible with SQLite & PostgreSQL
// ============================================================

const { getDatabase } = require('../database');

async function runV13Migration() {
  const db = await getDatabase();
  console.log('[MIGRATION] Running V13 Enterprise Schema Migration...');

  const isPg = db.type === 'postgres';

  // 1. Column Expansions across existing tables (Idempotent)
  const columnsToAdd = [
    // Multi-tenancy & Audit expansions for resources
    { table: 'resources', column: 'organization_id', type: 'TEXT' },
    { table: 'resources', column: 'environment', type: 'TEXT DEFAULT "Production"' },

    // Audit Log Enriched History
    { table: 'audit_logs', column: 'organization_id', type: 'TEXT' },
    { table: 'audit_logs', column: 'ip_address', type: 'TEXT' },
    { table: 'audit_logs', column: 'user_agent', type: 'TEXT' },
    { table: 'audit_logs', column: 'previous_value', type: 'TEXT' },
    { table: 'audit_logs', column: 'current_value', type: 'TEXT' },

    // Deployments multi-tenant tracking
    { table: 'deployments', column: 'organization_id', type: 'TEXT' },
    { table: 'deployments', column: 'git_commit_sha', type: 'TEXT' },

    // Applications metadata
    { table: 'applications', column: 'organization_id', type: 'TEXT' },

    // Recovery Results multi-tenant tracking
    { table: 'recovery_results', column: 'organization_id', type: 'TEXT' }
  ];

  for (const c of columnsToAdd) {
    try {
      await db.run(`ALTER TABLE ${c.table} ADD COLUMN ${c.column} ${c.type}`);
      console.log(`[MIGRATION] Added column ${c.table}.${c.column}`);
    } catch (err) {
      if (err.message.includes('duplicate column') || err.message.includes('already exists') || err.message.includes('duplicate')) {
        // Skip duplicate column error
      } else {
        console.warn(`[MIGRATION] Column addition notice (${c.table}.${c.column}): ${err.message}`);
      }
    }
  }

  // 2. New Enterprise Tables (Idempotent)

  // Chaos Experiments History
  if (isPg) {
    await db.run(`
      CREATE TABLE IF NOT EXISTS chaos_experiments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        target_resource TEXT NOT NULL,
        experiment_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Passed',
        rto_seconds INTEGER DEFAULT 0,
        rpo_seconds INTEGER DEFAULT 0,
        availability_impact TEXT,
        details JSONB,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  } else {
    await db.run(`
      CREATE TABLE IF NOT EXISTS chaos_experiments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        target_resource TEXT NOT NULL,
        experiment_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Passed',
        rto_seconds INTEGER DEFAULT 0,
        rpo_seconds INTEGER DEFAULT 0,
        availability_impact TEXT,
        details TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  console.log('[MIGRATION] Verified table: chaos_experiments');

  // Infrastructure Drift Reports
  if (isPg) {
    await db.run(`
      CREATE TABLE IF NOT EXISTS drift_reports (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        cloud_account_id TEXT,
        drift_score REAL NOT NULL DEFAULT 100.0,
        missing_count INTEGER DEFAULT 0,
        extra_count INTEGER DEFAULT 0,
        modified_count INTEGER DEFAULT 0,
        report_details JSONB,
        evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  } else {
    await db.run(`
      CREATE TABLE IF NOT EXISTS drift_reports (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        cloud_account_id TEXT,
        drift_score REAL NOT NULL DEFAULT 100.0,
        missing_count INTEGER DEFAULT 0,
        extra_count INTEGER DEFAULT 0,
        modified_count INTEGER DEFAULT 0,
        report_details TEXT,
        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  console.log('[MIGRATION] Verified table: drift_reports');

  // SLA Records & Availability Tracking
  if (isPg) {
    await db.run(`
      CREATE TABLE IF NOT EXISTS sla_records (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        sla_target REAL DEFAULT 99.95,
        monthly_sla REAL NOT NULL,
        yearly_sla REAL NOT NULL,
        uptime_minutes INTEGER DEFAULT 43200,
        downtime_minutes INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Compliant',
        evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  } else {
    await db.run(`
      CREATE TABLE IF NOT EXISTS sla_records (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        sla_target REAL DEFAULT 99.95,
        monthly_sla REAL NOT NULL,
        yearly_sla REAL NOT NULL,
        uptime_minutes INTEGER DEFAULT 43200,
        downtime_minutes INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Compliant',
        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  console.log('[MIGRATION] Verified table: sla_records');

  // AI Recommendation History & Implementation Tracking
  if (isPg) {
    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        application_type TEXT,
        recommended_cloud TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  } else {
    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        application_type TEXT,
        recommended_cloud TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  console.log('[MIGRATION] Verified table: ai_recommendations');

  // 3. Performance Indexes (Idempotent)
  const indexes = [
    { name: 'idx_resources_tenant', sql: 'CREATE INDEX IF NOT EXISTS idx_resources_tenant ON resources(tenant_id)' },
    { name: 'idx_resources_provider', sql: 'CREATE INDEX IF NOT EXISTS idx_resources_provider ON resources(provider)' },
    { name: 'idx_deployments_app', sql: 'CREATE INDEX IF NOT EXISTS idx_deployments_app ON deployments(application_id)' },
    { name: 'idx_audit_logs_tenant', sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id)' },
    { name: 'idx_incidents_tenant', sql: 'CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id)' }
  ];

  for (const idx of indexes) {
    try {
      await db.run(idx.sql);
    } catch (e) {
      // Ignore index errors if supported or existing
    }
  }
  console.log('[MIGRATION] V13 Enterprise Schema Migration completed successfully.');
}

module.exports = { runV13Migration };
