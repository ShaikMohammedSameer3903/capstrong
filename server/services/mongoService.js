// ============================================================
// MongoDB Service & Real-Time Synchronization Engine
// Multi-cloud Resource, Telemetry & Audit Persistence Layer
// ============================================================

const mongoose = require('mongoose');

// ── 1. Schemas & Models ──────────────────────────────────────

const ResourceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true },
  provider: { type: String, required: true, enum: ['azure', 'aws', 'gcp', 'docker', 'kubernetes'], index: true },
  location: { type: String, default: 'global' },
  status: { type: String, default: 'Active' },
  resourceGroup: { type: String, default: null },
  subscriptionId: { type: String, default: null, index: true },
  cloudAccountId: { type: String, default: null, index: true },
  tenantId: { type: String, default: 'demo-org-001', index: true },
  userId: { type: String, default: null },
  tags: { type: mongoose.Schema.Types.Mixed, default: {} },
  costMonthly: { type: Number, default: 0 },
  riskScore: { type: Number, default: 0 },
  healthStatus: { type: String, default: 'Healthy' },
  rawProperties: { type: mongoose.Schema.Types.Mixed, default: {} },
  syncedAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'resources'
});

const AuditLogSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, default: 'system' },
  userEmail: { type: String, default: 'system@cloudops.internal' },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, default: null },
  resourceId: { type: String, default: null },
  provider: { type: String, default: 'system' },
  ipAddress: { type: String, default: '127.0.0.1' },
  result: { type: String, default: 'Success' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

const TelemetrySchema = new mongoose.Schema({
  metricName: { type: String, required: true, index: true },
  provider: { type: String, required: true, index: true },
  resourceId: { type: String, default: null },
  value: { type: Number, required: true },
  unit: { type: String, default: '' },
  variance: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'telemetry_metrics'
});

const CloudAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true },
  userId: { type: String, default: null },
  provider: { type: String, required: true },
  accountName: { type: String, required: true },
  accountId: { type: String, default: null },
  region: { type: String, default: 'global' },
  status: { type: String, default: 'Active' },
  resourceCount: { type: Number, default: 0 },
  lastSync: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'cloud_accounts'
});

let ResourceModel = null;
let AuditLogModel = null;
let TelemetryModel = null;
let CloudAccountModel = null;

function getModels() {
  if (!ResourceModel) {
    ResourceModel = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
    AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
    TelemetryModel = mongoose.models.Telemetry || mongoose.model('Telemetry', TelemetrySchema);
    CloudAccountModel = mongoose.models.CloudAccount || mongoose.model('CloudAccount', CloudAccountSchema);
  }
  return { ResourceModel, AuditLogModel, TelemetryModel, CloudAccountModel };
}

// ── 2. Connection Management ─────────────────────────────────

let connectionState = {
  isConnected: false,
  error: null,
  uri: null,
  dbName: null,
  connectedAt: null
};

async function initializeMongo(uri, dbName = 'capstrong') {
  if (!uri) {
    connectionState.isConnected = false;
    connectionState.error = 'MONGODB_URI not specified in environment';
    return false;
  }

  connectionState.uri = uri.replace(/:([^:@]+)@/, ':****@');
  connectionState.dbName = dbName;

  try {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
      dbName: dbName
    });

    connectionState.isConnected = true;
    connectionState.error = null;
    connectionState.connectedAt = new Date().toISOString();

    getModels();
    console.log(`[MONGODB] Connected to cluster: ${connectionState.uri} (Database: "${dbName}")`);
    return true;
  } catch (err) {
    connectionState.isConnected = false;
    connectionState.error = err.message;
    console.warn(`[MONGODB NOTICE] Connection to MongoDB cluster failed: ${err.message}`);
    return false;
  }
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function getMongoDiagnostics() {
  const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    configured: !!(process.env.MONGODB_URI),
    connected: mongoose.connection.readyState === 1,
    status: readyStates[mongoose.connection.readyState] || 'unknown',
    dbName: connectionState.dbName || process.env.MONGODB_DB || 'capstrong',
    target: connectionState.uri || (process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@') : 'none'),
    lastError: connectionState.error,
    connectedAt: connectionState.connectedAt
  };
}

// ── 3. Real-Time Resource Sync Handlers ──────────────────────

/**
 * Bulk sync discovered cloud resources to MongoDB collection
 */
async function syncDiscoveredResources(resources, provider, accountId, tenantId, userId) {
  if (!isMongoConnected() || !Array.isArray(resources) || resources.length === 0) return;

  try {
    const { ResourceModel } = getModels();
    const ops = resources.map(r => ({
      updateOne: {
        filter: { id: r.id },
        update: {
          $set: {
            id: r.id,
            name: r.name,
            type: r.type,
            provider: provider,
            location: r.region || r.location || 'global',
            status: r.status || 'Active',
            resourceGroup: r.resourceGroup || null,
            subscriptionId: accountId || null,
            cloudAccountId: accountId || null,
            tenantId: tenantId || 'demo-org-001',
            userId: userId || null,
            tags: r.tags || {},
            costMonthly: r.cost_monthly || 0,
            riskScore: r.risk_score || 0,
            healthStatus: r.health_status || 'Healthy',
            rawProperties: r.properties || {},
            syncedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await ResourceModel.bulkWrite(ops);
    console.log(`[MONGODB-SYNC] Synced ${ops.length} ${provider.toUpperCase()} resources to MongoDB (Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount})`);
  } catch (err) {
    console.warn(`[MONGODB-SYNC ERROR] Failed to sync ${provider} resources:`, err.message);
  }
}

/**
 * Prune stale resources from MongoDB that no longer exist in cloud
 */
async function pruneStaleResources(provider, accountId, validResourceIds) {
  if (!isMongoConnected()) return;

  try {
    const { ResourceModel } = getModels();
    
    // Purge any terminated/deleted resources from MongoDB
    await ResourceModel.deleteMany({
      provider: provider,
      status: { $in: ['terminated', 'shutting-down', 'deleted', 'deleting'] }
    });

    const filter = {
      provider: provider,
      $or: [
        { cloudAccountId: accountId },
        { subscriptionId: accountId }
      ]
    };

    if (Array.isArray(validResourceIds) && validResourceIds.length > 0) {
      filter.id = { $nin: validResourceIds };
    }

    const deleteResult = await ResourceModel.deleteMany(filter);
    if (deleteResult.deletedCount > 0) {
      console.log(`[MONGODB-SYNC] Pruned ${deleteResult.deletedCount} deleted ${provider.toUpperCase()} resources from MongoDB`);
    }
  } catch (err) {
    console.warn(`[MONGODB-SYNC ERROR] Failed to prune ${provider} resources from MongoDB:`, err.message);
  }
}

/**
 * Synchronize security / operational audit record to MongoDB
 */
async function recordMongoAudit(auditData) {
  if (!isMongoConnected()) return;

  try {
    const { AuditLogModel } = getModels();
    await AuditLogModel.create({
      tenantId: auditData.tenantId || 'demo-org-001',
      userId: auditData.userId || 'system',
      userEmail: auditData.userEmail || 'system@cloudops.internal',
      action: auditData.action,
      resourceType: auditData.resourceType || null,
      resourceId: auditData.resourceId || null,
      provider: auditData.provider || 'system',
      ipAddress: auditData.ipAddress || '127.0.0.1',
      result: auditData.result || 'Success',
      details: auditData.details || {},
      timestamp: new Date()
    });
  } catch (err) {
    console.warn('[MONGODB-AUDIT ERROR] Failed to record audit log in MongoDB:', err.message);
  }
}

module.exports = {
  initializeMongo,
  isMongoConnected,
  getMongoDiagnostics,
  getModels,
  syncDiscoveredResources,
  pruneStaleResources,
  recordMongoAudit
};
