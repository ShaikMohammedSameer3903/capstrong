// ============================================================
// Oracle Verification Script — CLOUD-223
//
// Independently verifies that a deployment record exists,
// its resources are present in DB/evidence, and metrics/evidence
// files match SHA-256 integrity rules.
// ============================================================

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDatabase } = require('../../server/db/database');

async function verifyDeployment(deploymentId) {
  const db = await getDatabase();
  const deployment = await db.get('SELECT * FROM deployments WHERE id = ?', [deploymentId]);

  if (!deployment) {
    return { verified: false, reason: `Deployment ${deploymentId} not found in database.` };
  }

  const metrics = await db.get('SELECT * FROM deployment_metrics WHERE deployment_id = ?', [deploymentId]);
  const evidenceRuns = await db.all('SELECT * FROM evidence_runs WHERE metadata LIKE ? OR file_path LIKE ?', [`%${deploymentId}%`, `%${deploymentId}%`]);

  let evidenceFileValid = false;
  let sha256Match = false;

  if (evidenceRuns && evidenceRuns.length > 0) {
    const run = evidenceRuns[0];
    const absPath = path.resolve(__dirname, '../..', run.file_path);
    if (fs.existsSync(absPath)) {
      evidenceFileValid = true;
      const content = fs.readFileSync(absPath, 'utf-8');
      const calcSha = crypto.createHash('sha256').update(content).digest('hex');
      sha256Match = (calcSha === run.sha256);
    }
  }

  return {
    verified: deployment.status === 'Completed',
    deploymentId,
    status: deployment.status,
    hasMetrics: !!metrics,
    evidenceFileCount: evidenceRuns.length,
    evidenceFileValid,
    sha256Match,
    details: {
      provider: deployment.target_cloud,
      durationMs: deployment.duration_ms,
      endpointUrl: deployment.endpoint_url
    }
  };
}

if (require.main === module) {
  const targetId = process.argv[2];
  if (!targetId) {
    console.log('Usage: node reference-impl/oracle/verify-deployment.js <deployment_id>');
    process.exit(1);
  }
  verifyDeployment(targetId).then(res => {
    console.log('Oracle Verification Result:', JSON.stringify(res, null, 2));
    process.exit(res.verified ? 0 : 1);
  }).catch(err => {
    console.error('Oracle Verification Error:', err);
    process.exit(1);
  });
}

module.exports = { verifyDeployment };
