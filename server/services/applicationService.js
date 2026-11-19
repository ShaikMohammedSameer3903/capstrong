const { getDatabase } = require('../db/database');
const crypto = require('crypto');

class ApplicationService {
  /**
   * Get all applications for a tenant
   */
  async getApplications(tenantId, userId, isAdmin) {
    const db = await getDatabase();
    let sql = `SELECT * FROM applications WHERE tenant_id = ?`;
    let params = [tenantId];

    if (!isAdmin) {
      sql += ` AND user_id = ?`;
      params.push(userId);
    }
    sql += ` ORDER BY created_at DESC`;

    const rows = await db.all(sql, params);
    
    // Deduplicate applications by name to prevent duplicate UI card rendering
    const uniqueMap = new Map();
    for (const r of rows) {
      if (!uniqueMap.has(r.name)) {
        uniqueMap.set(r.name, {
          ...r,
          envVars: r.env_vars ? JSON.parse(r.env_vars) : {},
          cloudTargets: r.cloud_targets ? JSON.parse(r.cloud_targets) : [],
          tags: r.tags ? JSON.parse(r.tags) : []
        });
      }
    }

    return Array.from(uniqueMap.values());

  }

  /**
   * Get application by ID
   */
  async getApplicationById(id, tenantId) {
    const db = await getDatabase();
    let row = await db.get(`SELECT * FROM applications WHERE id = ? AND (tenant_id = ? OR tenant_id = 'demo-org-001')`, [id, tenantId]);
    if (!row) {
      row = await db.get(`SELECT * FROM applications WHERE id = ?`, [id]);
    }
    if (!row) return null;

    return {
      ...row,
      envVars: row.env_vars ? JSON.parse(row.env_vars) : {},
      cloudTargets: row.cloud_targets ? JSON.parse(row.cloud_targets) : [],
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  /**
   * Create new application in Catalog (Idempotent: updates existing if same name exists)
   */
  async createApplication(tenantId, userId, data) {
    const db = await getDatabase();
    const appName = (data.name || '').trim();

    // Check if an application with the same name already exists to avoid duplicates
    if (appName) {
      const existing = await db.get(
        `SELECT id FROM applications WHERE (tenant_id = ? OR tenant_id = 'demo-org-001') AND LOWER(name) = LOWER(?)`,
        [tenantId, appName]
      );
      if (existing) {
        return this.updateApplication(existing.id, tenantId, data);
      }
    }

    const id = `app-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const envVarsStr = JSON.stringify(data.envVars || {});
    const cloudTargetsStr = JSON.stringify(data.cloudTargets || ["azure", "aws", "gcp"]);
    const tagsStr = JSON.stringify(data.tags || []);
    const containerImage = data.containerImage || data.container_image || 'app-image:latest';

    await db.run(`
      INSERT INTO applications (id, tenant_id, user_id, name, description, version, container_image, repository_url, env_vars, cloud_targets, deployment_type, deployment_strategy, owner, tags, health_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      tenantId,
      userId,
      appName || data.name,
      data.description || '',
      data.version || '1.0.0',
      containerImage,
      data.repositoryUrl || data.repository_url || '',
      envVarsStr,
      cloudTargetsStr,
      data.deploymentType || data.deployment_type || 'Docker',
      data.deploymentStrategy || data.deployment_strategy || 'Rolling',
      data.owner || 'DevOps Team',
      tagsStr,
      'Provisioning'
    ]);

    return this.getApplicationById(id, tenantId);
  }

  /**
   * Update existing application
   */
  async updateApplication(id, tenantId, data) {
    const db = await getDatabase();
    const existing = await this.getApplicationById(id, tenantId);
    if (!existing) throw new Error("Application not found.");

    const name = data.name || existing.name;
    const description = data.description !== undefined ? data.description : existing.description;
    const version = data.version || existing.version;
    const containerImage = data.containerImage || existing.container_image;
    const repositoryUrl = data.repositoryUrl !== undefined ? data.repositoryUrl : existing.repository_url;
    const envVarsStr = data.envVars ? JSON.stringify(data.envVars) : existing.env_vars;
    const cloudTargetsStr = data.cloudTargets ? JSON.stringify(data.cloudTargets) : existing.cloud_targets;
    const deploymentType = data.deploymentType || existing.deployment_type;
    const deploymentStrategy = data.deploymentStrategy || existing.deployment_strategy;
    const owner = data.owner || existing.owner;
    const tagsStr = data.tags ? JSON.stringify(data.tags) : existing.tags;

    await db.run(`
      UPDATE applications 
      SET name = ?, description = ?, version = ?, container_image = ?, repository_url = ?, env_vars = ?, cloud_targets = ?, deployment_type = ?, deployment_strategy = ?, owner = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `, [
      name, description, version, containerImage, repositoryUrl, envVarsStr, cloudTargetsStr, deploymentType, deploymentStrategy, owner, tagsStr, id, tenantId
    ]);

    return this.getApplicationById(id, tenantId);
  }

  /**
   * Delete application
   */
  async deleteApplication(id, tenantId) {
    const db = await getDatabase();
    await db.run(`DELETE FROM applications WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
    return { success: true, id };
  }
}

module.exports = new ApplicationService();
