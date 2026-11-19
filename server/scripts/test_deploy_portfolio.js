require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const AwsDeploymentProvider = require('../providers/AwsDeploymentProvider');

async function testDeploy() {
  const provider = new AwsDeploymentProvider({
    account_id: process.env.AWS_ACCOUNT_ID || '783493260935',
    region: process.env.AWS_REGION || 'us-east-1',
    access_key_id: process.env.AWS_ACCESS_KEY_ID,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY
  });

  const appSpec = {
    id: 'portfolio-test-live',
    name: 'PORTFOLIO',
    deployment_type: 'AWS S3 + CloudFront',
    repository_url: 'https://github.com/ShaikMohammedSameer3903/PORTFOLIO.git',
    branch: 'main'
  };

  console.log('Initiating test live deployment to AWS for PORTFOLIO...');
  const result = await provider.deploy(appSpec, {
    deploymentId: `dep-${Date.now()}`,
    environment: 'production',
    onLog: async (step, msg) => console.log(`[${step}] ${msg}`)
  });

  console.log('\n--- DEPLOYMENT RESULT ---');
  console.log('Success:', result.success);
  console.log('Endpoint:', result.endpoint);
  console.log('ResourceId:', result.resourceId);
  console.log('Execution Mode:', result.executionMode);
  console.log('Is Sandbox:', result.isSandbox);
}

testDeploy().catch(console.error);
