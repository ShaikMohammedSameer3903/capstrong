const deploymentService = require('../services/deploymentService');
const { getDatabase } = require('../db/database');

async function testFullDeployment() {
  const db = await getDatabase();
  
  // Find PORTFOLIO app
  const app = await db.get("SELECT * FROM applications WHERE name LIKE '%PORTFOLIO%' LIMIT 1");
  console.log('Deploying App:', app?.name, 'ID:', app?.id);

  const tenantId = '808cc83e-a546-47e7-a03f-73a1ebba24f3';
  const userId = '5d52f86d-b709-40d7-9855-be8223ac9b93';

  const res = await deploymentService.deployApplication(
    tenantId,
    userId,
    app.id,
    'aws',
    'us-east-1',
    'production',
    'AWS S3 + CloudFront',
    'shaiksameer3909@gmail.com'
  );

  console.log('\n--- FULL DEPLOYMENT RESULT ---');
  console.log('Deployment ID:', res.id);
  console.log('Status:', res.status);
  console.log('Pipeline Stage:', res.pipeline_stage);
  console.log('Endpoint URL:', res.endpoint_url);
  console.log('S3 Bucket:', res.s3_bucket);
  console.log('AWS Region:', res.aws_region);
  console.log('Operation ID:', res.operation_id);
  console.log('Duration (ms):', res.duration_ms);

  console.log('\n--- TESTING ROLLBACK ---');
  const rollbackRes = await deploymentService.rollbackDeployment(res.id, tenantId);
  console.log('Rollback Result:', rollbackRes);
}

testFullDeployment().catch(console.error);
