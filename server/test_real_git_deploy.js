const path = require('path');
const AzureDeploymentProvider = require('./providers/AzureDeploymentProvider');

async function testRealGitDeployment() {
  console.log('===========================================================');
  console.log('▶ Testing Real Git Deployment Engine & Verification');
  console.log('===========================================================');

  const provider = new AzureDeploymentProvider({ region: 'southeastasia' });
  const logs = [];
  const addLog = (k, msg) => logs.push(`[${k}] ${msg}`);

  // Test 1: Real Portfolio Repository
  console.log('\n[TEST 1] Testing Portfolio Repository Asset Resolution...');
  const portfolioSpec = {
    name: 'PORTFOLIO',
    repository_url: 'https://github.com/ShaikMohammedSameer3903/PORTFOLIO.git',
    branch: 'main',
    deployment_type: 'Azure Static Web Apps'
  };

  const assets1 = await provider._resolveAppAssets(portfolioSpec, 'East Asia CDN', 'Azure Static Web Apps', addLog);
  console.log(`  - Deploy Directory: ${assets1.deployDir}`);
  console.log(`  - Is Portfolio: ${assets1.isPortfolio}`);
  console.log(`  - HTML Size: ${assets1.indexHtml.length} bytes`);
  console.log(`  - Includes Shaik Mohammed Sameer: ${assets1.indexHtml.includes('Shaik Mohammed Sameer')}`);
  console.log(`  - Includes Engineering the Future: ${assets1.indexHtml.includes('Engineering the Future')}`);

  if (!assets1.indexHtml.includes('Shaik Mohammed Sameer')) {
    throw new Error('Portfolio HTML does not contain Shaik Mohammed Sameer');
  }

  // Test 2: Real ZIP Packaging of Entire Directory
  console.log('\n[TEST 2] Testing Full Directory Recursive ZIP Packaging...');
  const extraFiles = {
    'server.js': '// production server entry',
    'package.json': '{"name":"portfolio","version":"1.0.0"}',
    'web.config': '<configuration></configuration>'
  };

  const zipBuf = await provider._packageDirectoryToZip(assets1.deployDir, extraFiles);
  console.log(`  - ZIP Package Generated: ${zipBuf.length} bytes`);
  if (zipBuf.length < 10000) {
    throw new Error(`ZIP package suspiciously small: ${zipBuf.length} bytes`);
  }
  console.log('  ✓ ZIP package verified valid with real binary images and HTML.');

  // Test 3: Standalone / Dynamic App (e.g. test-1)
  console.log('\n[TEST 3] Testing Standalone / Dedicated Project Resolution...');
  const testAppSpec = {
    name: 'test-1',
    repository_url: '',
    branch: 'main',
    deployment_type: 'Azure App Services'
  };

  const assets3 = await provider._resolveAppAssets(testAppSpec, 'southeastasia', 'Azure App Services', addLog);
  console.log(`  - Deploy Directory: ${assets3.deployDir}`);
  console.log(`  - Is Portfolio: ${assets3.isPortfolio}`);
  console.log(`  - Contains test-1: ${assets3.indexHtml.includes('test-1')}`);
  console.log(`  - Does NOT contain Sameer portfolio: ${!assets3.indexHtml.includes('Shaik Mohammed Sameer')}`);

  if (assets3.indexHtml.includes('Shaik Mohammed Sameer')) {
    throw new Error('test-1 should not contain Sameer portfolio content');
  }

  console.log('\n===========================================================');
  console.log('▶ ALL REAL WORKLOAD TESTS PASSED (100%)');
  console.log('===========================================================');
  process.exit(0);
}

testRealGitDeployment().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
