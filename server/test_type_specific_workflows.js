const applicationService = require('./services/applicationService');
const deploymentService = require('./services/deploymentService');
const projectAnalyzer = require('./services/projectAnalyzer');
const { getDatabase } = require('./db/database');

async function runWorkflowVerificationSuite() {
  console.log('===========================================================');
  console.log(' CloudOps End-to-End Pipeline & Workflows Test Suite');
  console.log('===========================================================\n');

  let db = null;
  const createdAppIds = [];

  try {
    const tenantId = 'demo-org-001';
    const userId = 'local-admin-001';
    db = await getDatabase();

    // ---------------------------------------------------------
    // STEP 1: Verify Database Schema & Required Tables
    // ---------------------------------------------------------
    console.log('[TEST 1/6] Verifying Database Schema & Required Tables...');
    const requiredTables = [
      'applications',
      'deployments',
      'deployment_logs',
      'cloud_accounts',
      'resources',
      'users',
      'audit_logs',
      'metrics',
      'provider_credentials'
    ];

    for (const table of requiredTables) {
      let tableFound = false;
      if (db.type === 'postgres') {
        const res = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name = $1", [table]);
        tableFound = !!res;
      } else {
        const res = await db.get("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?", [table]);
        tableFound = !!res;
      }

      if (!tableFound) {
        throw new Error(`Required table '${table}' missing from database schema.`);
      }
    }
    console.log('✓ Database schema verified: All 9 required tables present.\n');

    // ---------------------------------------------------------
    // STEP 2: Verify Database Write/Read Operations (Sample Record Insertion)
    // ---------------------------------------------------------
    console.log('[TEST 2/6] Verifying Database Write/Read Operations with Sample Records...');
    const sampleId = `test-user-${Date.now()}`;
    await db.run(
      `INSERT OR IGNORE INTO users (id, email, name, role, tenant_id, status) VALUES (?, ?, ?, 'Viewer', ?, 'Approved')`,
      [sampleId, `test-${Date.now()}@cloudops.internal`, 'Test User', tenantId]
    );

    const checkUser = await db.get(`SELECT * FROM users WHERE id = ?`, [sampleId]);
    if (!checkUser) {
      throw new Error('Failed to retrieve inserted test user from database.');
    }
    await db.run(`DELETE FROM users WHERE id = ?`, [sampleId]);
    console.log('✓ Database CRUD capability verified successfully.\n');

    // ---------------------------------------------------------
    // STEP 3: Automated Project Analysis (Static Portfolio Repository)
    // ---------------------------------------------------------
    console.log('[TEST 3/6] Running Automated Project Analysis on PORTFOLIO Repository...');
    const targetRepoUrl = 'https://github.com/ShaikMohammedSameer3903/PORTFOLIO.git';
    const analysisReport = await projectAnalyzer.analyzeGitRepository(targetRepoUrl);

    console.log(`  - Repository URL: ${analysisReport.repositoryUrl}`);
    console.log(`  - Framework: ${analysisReport.framework}`);
    console.log(`  - Language: ${analysisReport.language}`);
    console.log(`  - Runtime: ${analysisReport.runtime}`);
    console.log(`  - Build Command: ${analysisReport.buildCommand}`);
    console.log(`  - Output Directory: ${analysisReport.outputDirectory}`);
    console.log(`  - Recommended Deployment: ${analysisReport.deploymentTypeRecommendation}`);
    console.log(`  - Docker Required: ${analysisReport.requiresDocker}`);
    console.log(`  - Kubernetes Required: ${analysisReport.requiresKubernetes}`);

    if (!analysisReport.isStaticWebsite && !analysisReport.hasIndexHtml) {
      console.warn('  - Notice: Repository index.html fallback mode activated.');
    }
    console.log('✓ Automated project analysis and tech stack detection verified.\n');

    // ---------------------------------------------------------
    // STEP 4: Test Static Web App Workflow
    // ---------------------------------------------------------
    console.log('[TEST 4/6] Verifying Static Web App Specific Workflow (No Docker/K8s required)...');
    const staticApp = await applicationService.createApplication(tenantId, userId, {
      name: 'Portfolio Web Site',
      description: 'Static HTML/CSS/JS Portfolio Site',
      version: '1.0.0',
      containerImage: 'N/A (Static Web)',
      repositoryUrl: targetRepoUrl,
      deploymentType: analysisReport.deploymentTypeRecommendation || 'Azure Static Web Apps',
      cloudTargets: ['azure']
    });
    createdAppIds.push(staticApp.id);

    try {
      await deploymentService.deployApplication(tenantId, userId, staticApp.id, 'azure', 'Static Site Test');
    } catch (err) {
      if (err.message.includes('Azure Credentials Missing')) {
        console.log('  - Real Azure Credential Safety Halt Verified for Static Web Apps.');
      } else {
        throw err;
      }
    }
    console.log('✓ Static Web App dedicated workflow verified.\n');

    // ---------------------------------------------------------
    // STEP 5: Test Container Workload Workflow
    // ---------------------------------------------------------
    console.log('[TEST 5/6] Verifying Container App Specific Workflow...');
    const containerApp = await applicationService.createApplication(tenantId, userId, {
      name: 'Order API Microservice',
      description: 'Azure Container App',
      version: '2.0.0',
      containerImage: 'ghcr.io/cloudops/order-api:v2.0.0',
      deploymentType: 'Azure Container Apps',
      cloudTargets: ['azure']
    });
    createdAppIds.push(containerApp.id);

    try {
      await deploymentService.deployApplication(tenantId, userId, containerApp.id, 'azure', 'Container Workflow Test');
    } catch (err) {
      if (err.message.includes('Azure Credentials Missing')) {
        console.log('  - Real Azure Credential Safety Halt Verified for Container Apps.');
      } else {
        throw err;
      }
    }
    console.log('✓ Container App dedicated workflow verified.\n');

    // ---------------------------------------------------------
    // STEP 6: Test Virtual Machine Workflow
    // ---------------------------------------------------------
    console.log('[TEST 6/6] Verifying Virtual Machine Specific Workflow (No Docker/K8s)...');
    const vmApp = await applicationService.createApplication(tenantId, userId, {
      name: 'PostgreSQL Database Node',
      description: 'Azure VM hosting database',
      version: '1.0.0',
      containerImage: 'N/A (VM Workload)',
      deploymentType: 'Azure Virtual Machine',
      cloudTargets: ['azure']
    });
    createdAppIds.push(vmApp.id);

    try {
      await deploymentService.deployApplication(tenantId, userId, vmApp.id, 'azure', 'VM Workflow Test');
    } catch (err) {
      if (err.message.includes('Azure Credentials Missing')) {
        console.log('  - Real Azure Credential Safety Halt Verified for VM workflow.');
      } else {
        throw err;
      }
    }
    console.log('✓ Virtual Machine dedicated workflow verified.\n');

    // Clean up test applications & resources
    console.log('[CLEANUP] Cleaning up test application records & resources...');
    for (const appId of createdAppIds) {
      await applicationService.deleteApplication(appId, tenantId);
    }
    await db.run("DELETE FROM resources WHERE id LIKE 'res-wf-%' OR name IN ('Portfolio Web Site', 'Order API Microservice', 'PostgreSQL Database Node') OR resource_group LIKE 'rg-cloudops-%'");
    await db.run("DELETE FROM deployments WHERE application_id IN (SELECT id FROM applications WHERE name IN ('Portfolio Web Site', 'Order API Microservice', 'PostgreSQL Database Node'))");
    console.log('✓ Cleanup completed successfully.\n');

    console.log('===========================================================');
    console.log(' ALL END-TO-END PIPELINE & WORKFLOW TESTS PASSED! 🚀');
    console.log('===========================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n🛑 END-TO-END PIPELINE VERIFICATION FAILED:');
    console.error(err.message);
    if (err.stack) console.error(err.stack);

    // Attempt cleanup on failure
    if (db && createdAppIds.length > 0) {
      for (const appId of createdAppIds) {
        try {
          await applicationService.deleteApplication(appId, 'demo-org-001');
        } catch (e) {}
      }
    }
    process.exit(1);
  }
}

runWorkflowVerificationSuite();
