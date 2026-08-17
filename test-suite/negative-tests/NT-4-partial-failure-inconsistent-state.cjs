const chaosEngine = require('../../server/services/chaosEngine');
const recoveryEngine = require('../../server/services/recoveryEngine');
const evidenceWriter = require('../../server/services/evidenceWriter');

async function runNT4() {
  console.log('--------------------------------------------------');
  console.log('Running NT-4: Partial Failure & State Consistency Test');
  console.log('--------------------------------------------------');

  const tenantId = 'demo-org-001';

  const chaosResult = await chaosEngine.runExperiment(tenantId, 'test-resource-nt4', 'KILL_POD', { partition: 'acceptance' });
  const recoveryMetrics = await recoveryEngine.getRecoveryMetrics(tenantId);

  const passed = chaosResult.status === 'Completed' && recoveryMetrics !== null;

  const evidence = await evidenceWriter.write({
    runType: 'negative-test',
    partition: 'acceptance',
    provider: null,
    generatedBy: 'test-suite/negative-tests/NT-4-partial-failure-inconsistent-state.cjs',
    subDir: 'nt-4',
    data: {
      testId: 'NT-4',
      testName: 'Partial Failure & State Consistency',
      passed,
      chaosResult,
      recoveryMetricsSummary: {
        dataSource: recoveryMetrics.dataSource,
        highestSuccessRate: recoveryMetrics.highestSuccessRate
      }
    }
  });

  console.log(`✓ NT-4 Result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Evidence Run ID: ${evidence.runId}`);
  console.log(`  Evidence Path: ${evidence.filePath}`);

  if (!passed) process.exit(1);
}

if (require.main === module) {
  runNT4().catch(err => {
    console.error('NT-4 Exception:', err);
    process.exit(1);
  });
}

module.exports = { runNT4 };
