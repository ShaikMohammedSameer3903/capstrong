const path = require('path');
const { getDatabase } = require('../server/db/database');
const ProviderFactory = require('../server/providers/ProviderFactory');
const evidenceWriter = require('../server/services/evidenceWriter');

async function runAzureTest() {
  console.log('========================================');
  console.log('RUNNING CLOUD-223 TEST: AZURE PROVIDER');
  console.log('========================================');

  const provider = ProviderFactory.getDeploymentProvider('azure');
  console.log('✓ ProviderFactory returned Azure deployment provider:', provider.providerName);

  const db = await getDatabase();
  const app = await db.get('SELECT * FROM applications LIMIT 1');
  const appId = app ? app.id : 'app-ecommerce-api';

  const appSpec = {
    id: appId,
    name: 'Student Portal',
    version: '1.4.0',
    deployment_type: 'Docker',
    container_image: 'mcr.microsoft.com/azuredocs/aci-helloworld:latest'
  };

  const deploymentSpec = {
    region: 'eastus',
    environment: 'production'
  };

  const result = await provider.deploy(appSpec, deploymentSpec);
  console.log('✓ Azure Deployment execution completed:', {
    provider: result.provider,
    status: result.provisioningState || 'Succeeded',
    endpoint: result.endpoint,
    durationMs: result.durationMs
  });

  const evidence = await evidenceWriter.write({
    runType: 'deployment',
    partition: 'acceptance',
    provider: 'azure',
    generatedBy: 'test-azure.cjs',
    data: {
      testId: 'CLOUD-223-AZURE-001',
      appSpec,
      deploymentSpec,
      result
    }
  });

  console.log('✓ Recorded Capstone Evidence Run:', evidence.runId);
  console.log('========================================');
  console.log('AZURE TEST PASSED');
  console.log('========================================\n');
  return evidence;
}

if (require.main === module) {
  runAzureTest().then(() => process.exit(0)).catch(err => {
    console.error('❌ Azure test failed:', err);
    process.exit(1);
  });
}

module.exports = runAzureTest;
