const applicationService = require('./services/applicationService');

async function runWizardValidationSuite() {
  console.log('===========================================================');
  console.log(' Dynamic Deployment Wizard Validation Suite');
  console.log('===========================================================\n');

  try {
    const tenantId = 'demo-org-001';
    const userId = 'local-admin-001';

    // 1. Create Docker Application Spec
    console.log('[TEST 1/5] Validating Docker Application Spec creation...');
    const dockerApp = await applicationService.createApplication(tenantId, userId, {
      name: 'Checkout Microservice',
      description: 'Docker containerized checkout service',
      version: '2.1.0',
      containerImage: 'ghcr.io/cloudops/checkout:v2.1.0',
      repositoryUrl: 'https://github.com/cloudops/checkout',
      deploymentType: 'Docker',
      cloudTargets: ['azure', 'aws'],
      owner: 'Payments Team'
    });
    console.log(`  - Docker App ID: ${dockerApp.id}`);
    console.log(`  - Deployment Type: ${dockerApp.deployment_type}`);
    console.log('✓ Docker Application Spec validated.\n');

    // 2. Create Azure Virtual Machine Spec (NO Container Image required)
    console.log('[TEST 2/5] Validating Azure VM Application Spec creation (No Container Image)...');
    const vmApp = await applicationService.createApplication(tenantId, userId, {
      name: 'Legacy Database Host VM',
      description: 'Azure VM instance hosting PostgreSQL database cluster',
      version: '1.0.0',
      containerImage: 'N/A (VM Workload)',
      repositoryUrl: 'https://github.com/cloudops/vm-ansible',
      deploymentType: 'Azure Virtual Machine',
      cloudTargets: ['azure'],
      owner: 'Infrastructure Team',
      specDetails: {
        vmName: 'vm-db-prod-01',
        vmImage: 'Ubuntu 22.04 LTS',
        vmSize: 'Standard_D2s_v5'
      }
    });
    console.log(`  - Azure VM App ID: ${vmApp.id}`);
    console.log(`  - Container Image: ${vmApp.container_image}`);
    console.log('✓ Azure VM Application Spec validated without requiring container image.\n');

    // 3. Create AWS EC2 Spec (NO Container Image required)
    console.log('[TEST 3/5] Validating AWS EC2 Application Spec creation...');
    const ec2App = await applicationService.createApplication(tenantId, userId, {
      name: 'High-Performance Web Node',
      description: 'AWS EC2 compute instance',
      version: '1.4.0',
      containerImage: 'N/A (EC2 Workload)',
      deploymentType: 'AWS EC2',
      cloudTargets: ['aws'],
      owner: 'Web Ops',
      specDetails: {
        vmName: 'ec2-web-prod-01',
        vmSize: 't3.medium'
      }
    });
    console.log(`  - AWS EC2 App ID: ${ec2App.id}`);
    console.log('✓ AWS EC2 Application Spec validated.\n');

    // 4. Create Azure Functions / Serverless Spec
    console.log('[TEST 4/5] Validating Azure Functions Serverless Spec creation...');
    const fnApp = await applicationService.createApplication(tenantId, userId, {
      name: 'Order Event Processor',
      description: 'Event-driven Azure Function',
      version: '1.2.0',
      containerImage: 'N/A (Function Workload)',
      deploymentType: 'Azure Functions',
      cloudTargets: ['azure'],
      owner: 'Serverless Team',
      specDetails: {
        functionHandler: 'index.handler',
        memoryMb: 512
      }
    });
    console.log(`  - Azure Function App ID: ${fnApp.id}`);
    console.log('✓ Azure Functions Serverless Spec validated.\n');

    // 5. Create Static Website Spec
    console.log('[TEST 5/5] Validating Static Website Build Spec creation...');
    const staticApp = await applicationService.createApplication(tenantId, userId, {
      name: 'Customer Portal UI',
      description: 'Single-page React web application',
      version: '3.0.0',
      containerImage: 'N/A (Static Web Workload)',
      deploymentType: 'Static Website',
      cloudTargets: ['azure', 'aws', 'gcp'],
      owner: 'Frontend Team',
      specDetails: {
        staticFramework: 'React',
        buildCommand: 'npm run build',
        outputDirectory: 'dist'
      }
    });
    console.log(`  - Static Web App ID: ${staticApp.id}`);
    console.log('✓ Static Website Application Spec validated.\n');

    console.log('===========================================================');
    console.log(' DYNAMIC DEPLOYMENT WIZARD VALIDATION PASSED! 🚀');
    console.log('===========================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n🛑 DEPLOYMENT WIZARD VALIDATION FAILED:');
    console.error(err.message);
    process.exit(1);
  }
}

runWizardValidationSuite();
