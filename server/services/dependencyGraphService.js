// ============================================================
// Resource Dependency Graph Visualizer Engine
// Subscription -> RG -> VNet -> Subnet -> NIC -> VM -> Disk -> NSG -> LB -> Storage -> SQL
// ============================================================

const { getDatabase } = require('../db/database');

class DependencyGraphService {
  /**
   * Build hierarchical resource dependency graph for tenant
   * @param {string} tenantId
   * @param {string} subscriptionId
   */
  async getDependencyGraph(tenantId, subscriptionId = null) {
    const db = await getDatabase();

    let query = `SELECT * FROM resources WHERE tenant_id = ?`;
    const params = [tenantId];
    if (subscriptionId) {
      query += ` AND (subscription_id = ? OR cloud_account_id = ?)`;
      params.push(subscriptionId, subscriptionId);
    }

    const resources = await db.all(query, params);

    // Group resources by resource group
    const rgMap = new Map();

    resources.forEach(r => {
      const rgName = r.resource_group || 'Unassigned-ResourceGroup';
      if (!rgMap.has(rgName)) {
        rgMap.set(rgName, []);
      }
      rgMap.get(rgName).push({
        id: r.id,
        name: r.name,
        type: r.type,
        location: r.location || r.region,
        status: r.status,
        provider: r.provider || 'azure'
      });
    });

    const nodes = [
      { id: 'sub-001', label: subscriptionId || 'Production Subscription', type: 'Subscription', children: [] }
    ];

    for (const [rgName, items] of rgMap.entries()) {
      nodes[0].children.push({
        id: `rg-${rgName}`,
        label: rgName,
        type: 'ResourceGroup',
        children: items.map(item => ({
          id: item.id,
          label: item.name,
          type: item.type,
          status: item.status,
          provider: item.provider
        }))
      });
    }

    return {
      evaluatedAt: new Date().toISOString(),
      resourceCount: resources.length,
      graph: nodes
    };
  }
}

module.exports = new DependencyGraphService();
