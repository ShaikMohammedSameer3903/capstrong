const infraDiffEngine = require('../../server/services/infraDiffEngine');
const evidenceWriter = require('../../server/services/evidenceWriter');

async function runNT2() {
  console.log('--------------------------------------------------');
  console.log('Running NT-2: Behavioral Variance Underneath Test');
  console.log('--------------------------------------------------');

  const tenantId = 'demo-org-001';
  const { ablationResults } = await infraDiffEngine.runAblation(tenantId, 'acceptance');
  const { sensitivityResults } = await infraDiffEngine.runSensitivity(tenantId, 'acceptance');

  const passed = ablationResults.length > 0 && sensitivityResults.length > 0;

  const evidence = await evidenceWriter.write({
    runType: 'negative-test',
    partition: 'acceptance',
    provider: null,
    generatedBy: 'test-suite/negative-tests/NT-2-behaviour-underneath.cjs',
    subDir: 'nt-2',
    data: {
      testId: 'NT-2',
      testName: 'Behavioral Variance Underneath Abstraction',
      passed,
      ablationResultsCount: ablationResults.length,
      sensitivityResultsCount: sensitivityResults.length,
      ablationResults,
      sensitivityResults
    }
  });

  console.log(`✓ NT-2 Result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Evidence Run ID: ${evidence.runId}`);
  console.log(`  Evidence Path: ${evidence.filePath}`);

  if (!passed) process.exit(1);
}

if (require.main === module) {
  runNT2().catch(err => {
    console.error('NT-2 Exception:', err);
    process.exit(1);
  });
}

module.exports = { runNT2 };
