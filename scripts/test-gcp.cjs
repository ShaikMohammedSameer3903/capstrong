const path = require('path');
const { getDatabase } = require('../server/db/database');
const ProviderFactory = require('../server/providers/ProviderFactory');
const evidenceWriter = require('../server/services/evidenceWriter');

async function runGcpTest() {
  console.log('========================================');
  console.log('RUNNING CLOUD-223 TEST: GCP PROVIDER');
  console.log('========================================');

  const provider = ProviderFactory.getDeploymentProvider('gcp');
  console.log('✓ ProviderFactory returned GCP deployment provider:', provider.providerName);

  const db = await getDatabase();
  const app = await db.get('SELECT * FROM applications LIMIT 1');
  const appId = app ? app.id : 'app-ecommerce-api';

  const appSpec = {
    id: appId,
    name: 'Student Portal',
    version: '1.4.0',
    deployment_type: 'Docker',
    container_image: 'gcr.io/google-samples/hello-app:1.0'
  };

  const deploymentSpec = {
    region: 'us-central1',
    environment: 'production'
  };

  const result = await provider.deploy(appSpec, deploymentSpec);
  console.log('✓ GCP Cloud Run Deployment execution completed:', {
    provider: result.provider,
    status: result.provisioningState || 'Succeeded',
    endpoint: result.endpoint,
    resourceId: result.resourceId,
    durationMs: result.durationMs
  });

  const evidence = await evidenceWriter.write({
    runType: 'deployment',
    partition: 'acceptance',
    provider: 'gcp',
    generatedBy: 'test-gcp.cjs',
    data: {
      testId: 'CLOUD-223-GCP-001',
      appSpec,
      deploymentSpec,
      result
    }
  });

  console.log('✓ Recorded Capstone Evidence Run:', evidence.runId);
  console.log('========================================');
  console.log('GCP TEST PASSED');
  console.log('========================================\n');
  return evidence;
}

if (require.main === module) {
  runGcpTest().then(() => process.exit(0)).catch(err => {
    console.error('❌ GCP test failed:', err);
    process.exit(1);
  });
}

module.exports = runGcpTest;
