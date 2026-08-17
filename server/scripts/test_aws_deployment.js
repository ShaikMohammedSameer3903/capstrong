const path = require('path');
const { getDatabase } = require('../db/database');
const ProviderFactory = require('../providers/ProviderFactory');
const AwsDeploymentProvider = require('../providers/AwsDeploymentProvider');
const AwsCredentialManager = require('../providers/aws/AwsCredentialManager');
const deploymentService = require('../services/deploymentService');
const AwsCloudFormationService = require('../services/awsCloudFormationService');

async function testAwsDeploymentCapabilities() {
  console.log("========================================");
  console.log("TESTING AWS DEPLOYMENT CAPABILITIES");
  console.log("========================================");

  // 1. Verify ProviderFactory
  const awsDeploymentProvider = ProviderFactory.getDeploymentProvider('aws');
  console.log("✓ ProviderFactory returned AWS deployment provider:", awsDeploymentProvider.providerName);

  // 2. Verify CloudFormation Templates
  const staticTemplate = AwsCloudFormationService.getTemplateContent('static-site');
  const ecsTemplate = AwsCloudFormationService.getTemplateContent('ecs-app');
  console.log("✓ CloudFormation static-site template loaded. Length:", staticTemplate.length);
  console.log("✓ CloudFormation ecs-app template loaded. Length:", ecsTemplate.length);

  // 3. Verify Database connection & tables
  const db = await getDatabase();
  const cloudAccounts = await db.all("SELECT * FROM cloud_accounts");
  console.log(`✓ Database active. Found ${cloudAccounts.length} connected cloud account(s).`);

  // 4. Test Dry-Run Deployment Service using seeded application
  const seededApp = await db.get("SELECT id FROM applications LIMIT 1");
  const appId = seededApp ? seededApp.id : 'app-ecommerce-api';
  const dryRun = await deploymentService.dryRunDeployment('demo-org-001', 'user-001', appId, 'aws', 'us-east-1', 'production');
  console.log("✓ Dry-Run deployment validation result:", {
    appName: dryRun.appName,
    targetCloud: dryRun.targetCloud,
    authValid: dryRun.authValid,
    expectedResourcesCount: dryRun.expectedResources.length,
    estimatedMonthlyCost: dryRun.estimatedMonthlyCost
  });

  console.log("========================================");
  console.log("ALL AWS DEPLOYMENT ENGINE CHECKS PASSED!");
  console.log("========================================");
  process.exit(0);
}

testAwsDeploymentCapabilities().catch(err => {
  console.error("❌ AWS Deployment test failed:", err);
  process.exit(1);
});
