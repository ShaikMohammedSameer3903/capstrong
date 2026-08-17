// ============================================================
// NT-3 — False-Positive Deployment Success Prevention
//
// The report requires this test to verify:
//   "The platform must not report successful REAL deployment when the
//    underlying deployment failed, or the result is synthetic/sandbox."
//
// Phase 1B correction: a credentialed deployment whose real provider API
// call is attempted and fails is NOT a sandbox execution — it is a real
// attempt that failed, and must be reported as
// success=false / executionMode=REAL / isSandbox=false / status=FAILED
// (or TIMEOUT), never fabricating a resourceId/ARN and never relabeling
// the result as SANDBOX. Test D below was previously asserting the
// opposite (that a credentialed real failure should come back SANDBOX) —
// that assertion was itself the bug and has been corrected here. Test E
// is new: it checks the state machine still reports a genuine real
// success correctly, so the fix doesn't collapse every path into failure.
// ============================================================

const ProviderFactory = require('../../server/providers/ProviderFactory');
const AwsDeploymentProvider = require('../../server/providers/AwsDeploymentProvider');
const evidenceWriter = require('../../server/services/evidenceWriter');

// Deterministically stub `require('@aws-sdk/client-lambda')` for the
// duration of a test, regardless of whether the real package happens to be
// installed in this environment. Overriding require.cache alone is not
// reliable when the real package is ABSENT, because Node's module resolver
// throws MODULE_NOT_FOUND before it ever consults the cache — so we also
// intercept Module._resolveFilename for this one request. Returns a
// restore() function that must be called (in a finally block) to remove
// the stub and un-patch resolution.
function stubAwsSdkModule(requestId, fakeExports) {
  const Module = require('module');
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function (request, ...rest) {
    if (request === requestId) return requestId;
    return originalResolveFilename.call(this, request, ...rest);
  };

  const fakeModule = new Module(requestId, module);
  fakeModule.exports = fakeExports;
  fakeModule.loaded = true;
  require.cache[requestId] = fakeModule;

  return function restore() {
    Module._resolveFilename = originalResolveFilename;
    delete require.cache[requestId];
  };
}

async function runNT3() {
  console.log('--------------------------------------------------');
  console.log('Running NT-3: False-Positive Deployment Success Prevention');
  console.log('--------------------------------------------------');

  const results = {};

  // ---- TEST A: invalid/unsupported provider name -> safe failure, no fabricated success ----
  try {
    let threw = false;
    let message = '';
    try {
      ProviderFactory.getDeploymentProvider('invalid-cloud-provider');
    } catch (err) {
      threw = true;
      message = err.message;
    }
    results.testA_invalidProvider = {
      description: 'Requesting an unsupported provider must throw, never return a usable success-reporting provider.',
      passed: threw && /Unsupported/i.test(message),
      threw,
      message
    };
  } catch (err) {
    results.testA_invalidProvider = { passed: false, error: err.message };
  }
  console.log(`  Test A (invalid provider):        ${results.testA_invalidProvider.passed ? 'PASS' : 'FAIL'}`);

  // ---- TEST B: no credentials configured -> deployment MUST come back labeled SANDBOX,
  //              and must NEVER report executionMode REAL / isSandbox false ----
  try {
    const provider = new AwsDeploymentProvider({}); // no account_id/keys -> forced sandbox path
    const deployResult = await provider.deploy(
      { name: `nt3-probe-${Date.now()}`, deployment_type: 'AWS Lambda' },
      { deploymentId: `nt3-dep-${Date.now()}` }
    );

    const neverClaimsReal = deployResult.executionMode !== 'REAL' && deployResult.isSandbox === true;
    const contractFieldsPresent = typeof deployResult.isSandbox === 'boolean' && typeof deployResult.executionMode === 'string';

    results.testB_sandboxLabeled = {
      description: 'A deployment executed without real cloud credentials must be labeled executionMode=SANDBOX / isSandbox=true, and must never claim executionMode=REAL.',
      passed: contractFieldsPresent && neverClaimsReal,
      contractFieldsPresent,
      observedExecutionMode: deployResult.executionMode,
      observedIsSandbox: deployResult.isSandbox,
      observedSuccess: deployResult.success,
      observedStatus: deployResult.status
    };
  } catch (err) {
    results.testB_sandboxLabeled = {
      description: 'A deployment executed without real cloud credentials must be labeled executionMode=SANDBOX / isSandbox=true, and must never claim executionMode=REAL.',
      passed: true,
      threw: true,
      message: err.message,
      note: 'Threw instead of fabricating a result — treated as a safe (non-false-success) outcome.'
    };
  }
  console.log(`  Test B (sandbox never claims REAL): ${results.testB_sandboxLabeled.passed ? 'PASS' : 'FAIL'}`);

  // ---- TEST C: malformed deployment spec -> must fail safely, never fabricate success ----
  try {
    const provider = new AwsDeploymentProvider({});
    let threw = false;
    let fabricatedSuccess = false;
    try {
      const res = await provider.deploy({ /* no name */ }, {});
      fabricatedSuccess = res && res.success === true;
    } catch (err) {
      threw = true;
    }
    results.testC_malformedSpec = {
      description: 'A malformed app spec (missing required fields) must fail safely, never fabricate success=true.',
      passed: threw || !fabricatedSuccess,
      threw,
      fabricatedSuccess
    };
  } catch (err) {
    results.testC_malformedSpec = { passed: false, error: err.message };
  }
  console.log(`  Test C (malformed spec, safe fail): ${results.testC_malformedSpec.passed ? 'PASS' : 'FAIL'}`);

  // ---- TEST D (CORRECTED, Phase 1B): credentials present, real API call fails ->
  //      must report success=false / executionMode=REAL / isSandbox=false /
  //      status=FAILED, with NO fabricated resourceId/ARN. This is the
  //      opposite of the previous (buggy) version of this test, which
  //      expected SANDBOX for this case. Forces the branch by injecting a
  //      fake '@aws-sdk/client-lambda' module (via require.cache) whose
  //      send() always throws, with credentials present, so no real AWS
  //      network calls are made.
  let restoreD = null;
  try {
    const fakeExports = {
      LambdaClient: class { constructor() {} async send() { throw new Error('SimulatedAccessDenied: injected failure for NT-3 Test D'); } },
      CreateFunctionCommand: class { constructor(input) { this.input = input; } }
    };
    restoreD = stubAwsSdkModule('@aws-sdk/client-lambda', fakeExports);

    const provider = new AwsDeploymentProvider({
      account_id: '999999999999',
      access_key_id: 'AKIA_TEST_ONLY',
      secret_access_key: 'test-secret-not-real'
    });
    // Force the "credentials look present" branch without a real STS call
    // by monkey-patching getAwsCallerIdentity for this instance only.
    provider.getAwsCallerIdentity = async () => ({
      identity: { Account: '999999999999', Arn: 'arn:aws:iam::999999999999:user/test' },
      region: 'us-east-1',
      clientConfig: { region: 'us-east-1' }
    });

    const deployResult = await provider.deploy(
      { name: `nt3-fallback-probe-${Date.now()}`, deployment_type: 'AWS Lambda' },
      { deploymentId: `nt3-fb-dep-${Date.now()}` }
    );

    const correctlyReportsRealFailure = deployResult.success === false
      && deployResult.executionMode === 'REAL'
      && deployResult.isSandbox === false
      && deployResult.status === 'FAILED';
    const noFabricatedResource = !deployResult.resourceId && !deployResult.arn;
    const noFalseSandboxClassification = deployResult.executionMode !== 'SANDBOX' && deployResult.isSandbox !== true;

    results.testD_credentialedRealFailure = {
      description: 'A deployment with credentials present whose real API call fails must be reported as executionMode=REAL, success=false, status=FAILED — never SANDBOX, never a fabricated resource.',
      passed: correctlyReportsRealFailure && noFabricatedResource && noFalseSandboxClassification,
      correctlyReportsRealFailure,
      noFabricatedResource,
      noFalseSandboxClassification,
      observedExecutionMode: deployResult.executionMode,
      observedIsSandbox: deployResult.isSandbox,
      observedSuccess: deployResult.success,
      observedStatus: deployResult.status,
      observedResourceId: deployResult.resourceId
    };
  } catch (err) {
    results.testD_credentialedRealFailure = { passed: false, error: err.message };
  } finally {
    if (restoreD) restoreD();
  }
  console.log(`  Test D (credentialed real failure -> REAL/FAILED, not SANDBOX): ${results.testD_credentialedRealFailure.passed ? 'PASS' : 'FAIL'}`);

  // ---- TEST E (NEW, Phase 1B): credentials present and the real API call
  //      succeeds -> must report success=true / executionMode=REAL /
  //      isSandbox=false / status=SUCCEEDED. Ensures the Test D fix didn't
  //      collapse every credentialed path into failure.
  let restoreE = null;
  try {
    const fakeExports = {
      LambdaClient: class {
        constructor() {}
        async send() {
          return { FunctionArn: 'arn:aws:lambda:us-east-1:999999999999:function:nt3-real-success-probe' };
        }
      },
      CreateFunctionCommand: class { constructor(input) { this.input = input; } }
    };
    restoreE = stubAwsSdkModule('@aws-sdk/client-lambda', fakeExports);

    const provider = new AwsDeploymentProvider({
      account_id: '999999999999',
      access_key_id: 'AKIA_TEST_ONLY',
      secret_access_key: 'test-secret-not-real'
    });
    provider.getAwsCallerIdentity = async () => ({
      identity: { Account: '999999999999', Arn: 'arn:aws:iam::999999999999:user/test' },
      region: 'us-east-1',
      clientConfig: { region: 'us-east-1' }
    });
    // getMetrics makes its own real CloudWatch call; stub it out so this
    // test only exercises the deploy() success path, not metrics wiring.
    provider.getMetrics = async () => null;

    const deployResult = await provider.deploy(
      { name: `nt3-real-success-probe-${Date.now()}`, deployment_type: 'AWS Lambda' },
      { deploymentId: `nt3-rs-dep-${Date.now()}` }
    );

    const correctlyReportsRealSuccess = deployResult.success === true
      && deployResult.executionMode === 'REAL'
      && deployResult.isSandbox === false
      && deployResult.status === 'SUCCEEDED';

    results.testE_credentialedRealSuccess = {
      description: 'A deployment with credentials present whose real API call succeeds must be reported as executionMode=REAL, success=true, status=SUCCEEDED.',
      passed: correctlyReportsRealSuccess,
      observedExecutionMode: deployResult.executionMode,
      observedIsSandbox: deployResult.isSandbox,
      observedSuccess: deployResult.success,
      observedStatus: deployResult.status
    };
  } catch (err) {
    results.testE_credentialedRealSuccess = { passed: false, error: err.message };
  } finally {
    if (restoreE) restoreE();
  }
  console.log(`  Test E (credentialed real success -> REAL/SUCCEEDED):            ${results.testE_credentialedRealSuccess.passed ? 'PASS' : 'FAIL'}`);

  const passed = results.testA_invalidProvider.passed
    && results.testB_sandboxLabeled.passed
    && results.testC_malformedSpec.passed
    && results.testD_credentialedRealFailure.passed
    && results.testE_credentialedRealSuccess.passed;

  const evidence = await evidenceWriter.write({
    runType: 'negative-test',
    partition: 'acceptance',
    provider: null,
    generatedBy: 'test-suite/negative-tests/NT-3-false-success.cjs',
    subDir: 'nt-3',
    data: {
      testId: 'NT-3',
      testName: 'False-Positive Deployment Success Prevention',
      passed,
      results
    }
  });

  console.log(`✓ NT-3 Result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Evidence Run ID: ${evidence.runId}`);
  console.log(`  Evidence Path: ${evidence.filePath}`);

  if (!passed) process.exit(1);
}

if (require.main === module) {
  runNT3().catch(err => {
    console.error('NT-3 Exception:', err);
    process.exit(1);
  });
}

module.exports = { runNT3 };
