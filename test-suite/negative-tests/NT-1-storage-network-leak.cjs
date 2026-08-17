const infraDiffEngine = require('../../server/services/infraDiffEngine');
const evidenceWriter = require('../../server/services/evidenceWriter');

async function runNT1() {
  console.log('--------------------------------------------------');
  console.log('Running NT-1: Storage & Network Leakage Detection');
  console.log('--------------------------------------------------');

  const tenantId = 'demo-org-001';
  const matrix = await infraDiffEngine.getInfraMatrix(tenantId);

  const storageLeak = matrix.find(m => m.category.includes('Storage'));
  const networkLeak = matrix.find(m => m.category.includes('Network'));

  const detected = !!(storageLeak && networkLeak);

  const evidence = await evidenceWriter.write({
    runType: 'negative-test',
    partition: 'acceptance',
    provider: null,
    generatedBy: 'test-suite/negative-tests/NT-1-storage-network-leak.cjs',
    subDir: 'nt-1',
    data: {
      testId: 'NT-1',
      testName: 'Storage & Network Abstraction Leakage Detection',
      passed: detected,
      storageLeakDetected: !!storageLeak,
      networkLeakDetected: !!networkLeak,
      matrix
    }
  });

  console.log(`✓ NT-1 Result: ${detected ? 'PASS' : 'FAIL'}`);
  console.log(`  Evidence Run ID: ${evidence.runId}`);
  console.log(`  Evidence Path: ${evidence.filePath}`);

  if (!detected) process.exit(1);
}

if (require.main === module) {
  runNT1().catch(err => {
    console.error('NT-1 Exception:', err);
    process.exit(1);
  });
}

module.exports = { runNT1 };
