const { runNT1 } = require('./negative-tests/NT-1-storage-network-leak.cjs');
const { runNT2 } = require('./negative-tests/NT-2-behaviour-underneath.cjs');
const { runNT3 } = require('./negative-tests/NT-3-false-success.cjs');
const { runNT4 } = require('./negative-tests/NT-4-partial-failure-inconsistent-state.cjs');
const { runNT5 } = require('./negative-tests/NT-5-retry-concurrency-corruption.cjs');
const evidenceWriter = require('../server/services/evidenceWriter');

async function runAll() {
  console.log('===========================================================');
  console.log(' CLOUD-223 CAPSTONE ACCEPTANCE & NEGATIVE-TEST SUITE RUNNER');
  console.log('===========================================================\n');

  try {
    await runNT1();
    await runNT2();
    await runNT3();
    await runNT4();
    await runNT5();

    console.log('\nGenerating evidence manifest.json...');
    const manifest = await evidenceWriter.generateManifest();

    console.log('\n===========================================================');
    console.log(` ALL 5 NEGATIVE TESTS PASSED SUCCESSFULLY! 🚀`);
    console.log(` Evidence Files Tracked in Manifest: ${manifest.totalFiles}`);
    console.log('===========================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n🛑 TEST SUITE FAILURE:', err.message);
    process.exit(1);
  }
}

runAll();
