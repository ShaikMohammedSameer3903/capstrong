const path = require('path');
const runAzureTest = require('./test-azure.cjs');
const runAwsTest = require('./test-aws.cjs');
const runGcpTest = require('./test-gcp.cjs');
const runFailureTest = require('./test-failure.cjs');
const runTimeoutTest = require('./test-timeout.cjs');
const runRetryTest = require('./test-retry.cjs');
const runConcurrencyTest = require('./test-concurrency.cjs');
const runAbstractionTest = require('./test-abstraction.cjs');
const evidenceWriter = require('../server/services/evidenceWriter');

async function runAllCloud223Tests() {
  console.log('\n================================================================');
  console.log('🚀 MASTER CLOUD-223 CAPSTONE REPRODUCIBLE TEST CAMPAIGN STARTING');
  console.log('================================================================\n');

  const results = [];

  try {
    results.push(await runAzureTest());
    results.push(await runAwsTest());
    results.push(await runGcpTest());
    results.push(await runFailureTest());
    results.push(await runTimeoutTest());
    results.push(await runRetryTest());
    results.push(await runConcurrencyTest());
    results.push(await runAbstractionTest());

    console.log('[MASTER TEST SUITE] Generating Evidence Manifest (manifest.json)...');
    const manifest = await evidenceWriter.generateManifest();

    console.log('\n================================================================');
    console.log('🎉 ALL 8 CLOUD-223 CAPSTONE REPRODUCIBILITY TESTS PASSED SUCCESSFULLY!');
    console.log(`Total Evidence Files Registered: ${manifest.totalFiles}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ CLOUD-223 Test Suite Execution Failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllCloud223Tests().then(() => process.exit(0));
}

module.exports = runAllCloud223Tests;
