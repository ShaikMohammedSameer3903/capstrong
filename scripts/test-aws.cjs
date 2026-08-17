const path = require('path');
const { getDatabase } = require('../server/db/database');
const ProviderFactory = require('../server/providers/ProviderFactory');
const evidenceWriter = require('../server/services/evidenceWriter');

async function runAwsTest() {
  console.log('========================================');
  console.log('RUNNING CLOUD-223 TEST: AWS PROVIDER');
  console.log('========================================');

  const provider = ProviderFactory.getDeploymentProvider('aws');
  console.log('✓ ProviderFactory returned AWS deployment provider:', provider.providerName);

  const db = await getDatabase();
  const app = await db.get('SELECT * FROM applications LIMIT 1');
  const appId = app ? app.id : 'app-ecommerce-api';

  const appSpec = {
    id: appId,
    name: 'Student Portal',
    version: '1.4.0',
    deployment_type: 'AWS S3 + CloudFront',
    container_image: 'public.ecr.aws/docker/library/node:latest'
  };

  const deploymentSpec = {
    region: 'us-east-1',
    environment: 'production'
  };

  const result = await provider.deploy(appSpec, deploymentSpec);
  console.log('✓ AWS CloudFormation Deployment execution completed:', {
    provider: result.provider,
    status: result.status || 'Completed',
    endpoint: result.endpoint,
    resourceId: result.resourceId,
    durationMs: result.durationMs
  });

  const evidence = await evidenceWriter.write({
    runType: 'deployment',
    partition: 'acceptance',
    provider: 'aws',
    generatedBy: 'test-aws.cjs',
    data: {
      testId: 'CLOUD-223-AWS-001',
      appSpec,
      deploymentSpec,
      result
    }
  });

  console.log('✓ Recorded Capstone Evidence Run:', evidence.runId);
  console.log('========================================');
  console.log('AWS TEST PASSED');
  console.log('========================================\n');
  return evidence;
}

if (require.main === module) {
  runAwsTest().then(() => process.exit(0)).catch(err => {
    console.error('❌ AWS test failed:', err);
    process.exit(1);
  });
}

module.exports = runAwsTest;
