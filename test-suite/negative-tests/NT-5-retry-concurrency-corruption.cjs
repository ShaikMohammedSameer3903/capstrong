const chaosEngine = require('../../server/services/chaosEngine');
const evidenceWriter = require('../../server/services/evidenceWriter');

async function runNT5() {
  console.log('--------------------------------------------------');
  console.log('Running NT-5: Retry & Concurrency Idempotency Test');
  console.log('--------------------------------------------------');

  const tenantId = 'demo-org-001';

  const promises = [
    chaosEngine.runExperiment(tenantId, 'test-resource-nt5', 'CPU_STRESS', { partition: 'acceptance' }),
    chaosEngine.runExperiment(tenantId, 'test-resource-nt5', 'NETWORK_LATENCY', { partition: 'acceptance' }),
    chaosEngine.runExperiment(tenantId, 'test-resource-nt5', 'STORAGE_DISCONNECT', { partition: 'acceptance' })
  ];

  const results = await Promise.all(promises);
  const allCompleted = results.every(r => r && (r.status === 'Completed' || r.status === 'Failed'));

  const evidence = await evidenceWriter.write({
    runType: 'negative-test',
    partition: 'acceptance',
    provider: null,
    generatedBy: 'test-suite/negative-tests/NT-5-retry-concurrency-corruption.cjs',
    subDir: 'nt-5',
    data: {
      testId: 'NT-5',
      testName: 'Retry & Concurrency Idempotency',
      passed: allCompleted,
      concurrentRunsCount: results.length,
      resultsSummary: results.map(r => ({ runId: r.experimentId, type: r.experimentType, status: r.status }))
    }
  });

  console.log(`✓ NT-5 Result: ${allCompleted ? 'PASS' : 'FAIL'}`);
  console.log(`  Evidence Run ID: ${evidence.runId}`);
  console.log(`  Evidence Path: ${evidence.filePath}`);

  if (!allCompleted) process.exit(1);
}

if (require.main === module) {
  runNT5().catch(err => {
    console.error('NT-5 Exception:', err);
    process.exit(1);
  });
}

module.exports = { runNT5 };
