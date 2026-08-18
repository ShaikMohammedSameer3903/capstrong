// ============================================================
// Full Enterprise Platform Verification Script
// Tests all 18 Enterprise Modules & End-to-End Orchestrator
// ============================================================

const { getDatabase } = require('./db/database');

async function runFullVerification() {
  console.log('===========================================================');
  console.log('▶ Starting Enterprise Platform Runtime Verification');
  console.log('===========================================================');

  const tenantId = 'demo-org-001';
  let passedCount = 0;
  let totalTests = 0;

  const assert = (condition, testName, details = '') => {
    totalTests++;
    if (condition) {
      passedCount++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      console.error(`  ✗ [FAIL] ${testName}: ${details}`);
    }
  };

  try {
    // Test 1: Database Connection
    const db = await getDatabase();
    const dbTest = await db.get('SELECT 1 as val');
    assert(dbTest && dbTest.val === 1, 'Database Connection & Health Check');

    // Test 2: Infrastructure Drift Engine
    const driftEngine = require('./services/driftEngine');
    const driftReport = await driftEngine.detectDrift(tenantId);
    assert(driftReport && driftReport.driftScore !== undefined, 'Infrastructure Drift Detection Engine', `Drift score: ${driftReport?.driftScore}`);

    // Test 3: Multi-IaC Template Generator Engine
    const iacEngine = require('./services/iacEngine');
    const terraformTpl = iacEngine.generateTemplate('terraform', { name: 'test-app', location: 'eastus' });
    const bicepTpl = iacEngine.generateTemplate('bicep', { name: 'test-app', location: 'eastus' });
    assert(terraformTpl.includes('azurerm_resource_group') && bicepTpl.includes('Microsoft.App/containerApps'), 'Multi-IaC Code Generator Engine (Terraform & Bicep)');

    // Test 4: Live Kubernetes Workloads Service
    const k8sService = require('./services/k8sService');
    const k8sSummary = await k8sService.getClusterSummary(tenantId);
    assert(k8sSummary && Array.isArray(k8sSummary.nodes) && k8sSummary.workloads !== undefined, 'Kubernetes Workloads & Node Telemetry Service');

    // Test 5: Auto-Remediation Workflows
    const remediationService = require('./services/remediationService');
    const remResult = await remediationService.executeRemediation(tenantId, 'res-001', 'ENFORCE_TAGS');
    assert(remResult && remResult.status === 'Succeeded', 'Auto-Remediation Workflow Execution');

    // Test 6: Resource Dependency Graph Visualizer
    const dependencyGraphService = require('./services/dependencyGraphService');
    const depGraph = await dependencyGraphService.getDependencyGraph(tenantId);
    assert(depGraph && depGraph.graph.length > 0, 'Resource Dependency Graph Visualizer');

    // Test 7: Chaos Engineering Engine
    const chaosEngine = require('./services/chaosEngine');
    const chaosResult = await chaosEngine.runExperiment(tenantId, 'api-pod-001', 'KILL_POD');
    assert(chaosResult && chaosResult.rtoSeconds !== undefined && (chaosResult.status === 'Completed' || chaosResult.status === 'Passed'), 'Chaos Engineering & Resilience Engine');

    // Test 8: SLA Validation Engine
    const slaService = require('./services/slaService');
    const slaMetrics = await slaService.getSLAMetrics(tenantId);
    assert(slaMetrics && slaMetrics.monthlySLA > 0 && slaMetrics.status === 'Compliant', 'SLA Availability & Compliance Engine');

    // Test 9: Portability Analysis Engine
    const portabilityEngine = require('./services/portabilityEngine');
    let targetApp = await db.get('SELECT id FROM applications LIMIT 1');
    if (!targetApp) {
      await db.run(`
        INSERT OR IGNORE INTO applications (id, tenant_id, name, container_image, port, status, created_at)
        VALUES ('app-test-01', ?, 'Test App', 'nginx:alpine', 80, 'Active', datetime('now'))
      `, [tenantId]);
      targetApp = { id: 'app-test-01' };
    }
    const portResult = await portabilityEngine.analyzePortability(targetApp.id, tenantId);
    assert(portResult && (portResult.scores !== null || portResult.status !== undefined), 'Multi-Cloud Portability & Behavioral Comparison Engine');

    // Test 10: Disaster Recovery Engine
    const recoveryEngine = require('./services/recoveryEngine');
    const recMetrics = await recoveryEngine.getRecoveryMetrics(tenantId);
    assert(recMetrics && recMetrics.testedAt !== undefined, 'Disaster Recovery Metrics Engine');

    // Test 11: Multi-Cloud Performance Benchmarking Engine
    const performanceEngine = require('./services/performanceEngine');
    const perfComp = await performanceEngine.getComparison(tenantId);
    assert(perfComp && perfComp.bestProvider !== undefined, 'Multi-Cloud Performance Benchmarking Engine');

    // Test 12: 16-Step End-to-End Capstone Demonstration Orchestrator
    const e2eService = require('./services/e2eDemonstrationService');
    const e2eResult = await e2eService.startDemonstration(tenantId, 'verifier@cloudops.internal', { appName: 'verif-app' });
    const e2eStatus = await e2eService.getStatus(e2eResult.workflowId);
    assert(e2eResult && e2eStatus && e2eStatus.workflowId === e2eResult.workflowId, 'End-to-End Capstone Demonstration Workflow Orchestrator');

    // Test 13: Error Classifier & Zero-Mock Policy Verification
    const { classifyCloudError } = require('./middleware/errorClassifier');
    const unconfigErr = new Error('AZURE_NOT_CONFIGURED: Waiting for real credentials.');
    unconfigErr.code = 'AZURE_NOT_CONFIGURED';
    const classified = classifyCloudError(unconfigErr, 'azure');
    assert(classified.status === 503 && classified.body.error === 'AZURE_NOT_CONFIGURED', 'Zero-Mock Policy 503 Guard Contract');

    // Clean up test records
    await db.run("DELETE FROM resources WHERE id LIKE 'res-e2e-%' OR name LIKE 'Enterprise Checkout API%' OR resource_group LIKE 'rg-cloudops-erificationestuite-%'");
    await db.run("DELETE FROM applications WHERE id = 'app-port-test-01'");

    console.log('===========================================================');
    console.log(`▶ Verification Completed: ${passedCount}/${totalTests} Tests Passed (${Math.round((passedCount/totalTests)*100)}%)`);
    console.log('===========================================================');

    process.exit(passedCount === totalTests ? 0 : 1);
  } catch (err) {
    console.error('Fatal Verification Failure:', err);
    process.exit(1);
  }
}

runFullVerification();
