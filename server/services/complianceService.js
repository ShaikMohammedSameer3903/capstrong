// ============================================================
// ISO 27017 Compliance Audits & Optimization Score Engine Service
// Weighted Sub-Scores & Overall Cloud Health Calculator
// ============================================================

const { getDatabase } = require('../db/database');


/**
 * Seed compliance policies if empty
 */
async function ensureComplianceSeeded(tenantId) {
  // No synthetic seeding — compliance audits evaluate real Security Hub, Defender, and SCC findings
  return;
}

/**
 * Recalculate and update the 7 sub-scores and overall health score
 */
async function updateScores(tenantId) {
  const db = await getDatabase();

  // Load compliance rules to audit compliance percentage
  const policies = await db.all('SELECT status, category FROM compliance_policies WHERE tenant_id = ?', [tenantId]);
  const totalCount = policies.length;
  const compliantCount = policies.filter(p => p.status === 'Compliant').length;
  const compliancePercentage = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

  // Audit actual resources to adjust performance, cost, and availability scores
  const resources = await db.all('SELECT status, cost_impact, health_status FROM resources WHERE tenant_id = ?', [tenantId]);
  const stoppedVMs = resources.filter(r => r.status === 'Stopped' || r.status === 'Deallocated').length;
  const stoppedRatio = resources.length > 0 ? (stoppedVMs / resources.length) : 0;

  // Let's audit active incidents for security impacts
  const activeIncidents = await db.all('SELECT severity FROM incidents WHERE tenant_id = ? AND status != "Closed" AND status != "Resolved"', [tenantId]);
  const criticalCount = activeIncidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'SEV0').length;

  // Sub-scores calculations
  const performanceScore = Math.max(50, 100 - Math.round(stoppedRatio * 35));
  const costScore = Math.max(50, 100 - (resources.length > 10 ? 12 : 5)); // Heuristic adjustments based on scale
  const securityScore = Math.max(45, 100 - (criticalCount * 12) - (policies.filter(p => p.category === 'MFA' && p.status === 'Non-Compliant').length * 15));
  const complianceScore = compliancePercentage;
  const availabilityScore = Math.max(50, 100 - Math.round(stoppedRatio * 40));
  const backupScore = Math.max(55, 100 - (policies.filter(p => p.category === 'Backup' && p.status === 'Non-Compliant').length * 20));
  const governanceScore = Math.max(60, 100 - (policies.filter(p => p.category === 'Tagging' && p.status === 'Non-Compliant').length * 20));

  // Weighted Health Score calculation
  // Security (20%), Cost (15%), Compliance (15%), Availability (15%), Performance (15%), Backup (10%), Governance (10%)
  const weightedOverall = Math.round(
    (securityScore * 0.20) +
    (costScore * 0.15) +
    (complianceScore * 0.15) +
    (availabilityScore * 0.15) +
    (performanceScore * 0.15) +
    (backupScore * 0.10) +
    (governanceScore * 0.10)
  );

  const scoreId = `scores-${tenantId}`;
  await db.run(`
    INSERT INTO optimization_scores (
      id, tenant_id, performance_score, cost_score, security_score,
      compliance_score, availability_score, backup_score, governance_score, overall_score, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      performance_score = excluded.performance_score,
      cost_score = excluded.cost_score,
      security_score = excluded.security_score,
      compliance_score = excluded.compliance_score,
      availability_score = excluded.availability_score,
      backup_score = excluded.backup_score,
      governance_score = excluded.governance_score,
      overall_score = excluded.overall_score,
      updated_at = CURRENT_TIMESTAMP
  `, [
    scoreId,
    tenantId,
    performanceScore,
    costScore,
    securityScore,
    complianceScore,
    availabilityScore,
    backupScore,
    governanceScore,
    weightedOverall
  ]);

  return {
    performanceScore,
    costScore,
    securityScore,
    complianceScore,
    availabilityScore,
    backupScore,
    governanceScore,
    overallScore: weightedOverall
  };
}

/**
 * Get scorecard dashboard details
 */
async function getScores(tenantId) {
  const db = await getDatabase();
  await ensureComplianceSeeded(tenantId);

  const scores = await db.get('SELECT * FROM optimization_scores WHERE tenant_id = ?', [tenantId]);
  
  if (!scores) {
    return await updateScores(tenantId);
  }

  return scores;
}

/**
 * Get compliance policies
 */
async function getComplianceData(tenantId) {
  const db = await getDatabase();
  await ensureComplianceSeeded(tenantId);

  const policies = await db.all('SELECT * FROM compliance_policies WHERE tenant_id = ?', [tenantId]);
  const compliantCount = policies.filter(p => p.status === 'Compliant').length;
  const totalCount = policies.length;
  const percentage = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

  return {
    percentage,
    compliantCount,
    failedCount: totalCount - compliantCount,
    policies
  };
}

/**
 * Executes a simulated remediation on a compliance policy
 */
async function remediatePolicy(policyId, tenantId) {
  const db = await getDatabase();
  const policy = await db.get('SELECT * FROM compliance_policies WHERE id = ? AND tenant_id = ?', [policyId, tenantId]);

  if (!policy) {
    throw new Error('Compliance policy not found.');
  }

  // Update status to Compliant
  await db.run('UPDATE compliance_policies SET status = "Compliant", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [policyId]);

  // Recalculate scores
  const updatedScores = await updateScores(tenantId);

  // Return resolved indicator and updated scores
  return {
    success: true,
    policyId,
    updatedScores
  };
}

module.exports = {
  getScores,
  getComplianceData,
  remediatePolicy,
  updateScores
};
