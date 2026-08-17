// ============================================================
// Repeatability Engine — CLOUD-223 (O4/KPI-4)
//
// Runs KPI-1/2/3-producing operations across ≥3 independent trials
// and reports the standard deviation / 95% confidence interval of
// each, so repeatability can be reported honestly rather than as an
// unrelated metric (e.g. RTO std dev).
//
// No hardcoded fallback objects — every number traces back to a
// real invocation of infraDiffEngine / comparisonEngine against the
// live database, persisted via EvidenceWriter.
// ============================================================

const infraDiffEngine = require('./infraDiffEngine');
const comparisonEngine = require('./comparisonEngine');
const evidenceWriter = require('./evidenceWriter');

class RepeatabilityEngine {
  /** Population standard deviation of a numeric array. */
  _stdDev(values) {
    if (!values || values.length === 0) return 0;
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
    return parseFloat(Math.sqrt(variance).toFixed(4));
  }

  /** 95% confidence interval (normal approximation) of a numeric array. */
  _confidenceInterval95(values) {
    if (!values || values.length < 2) {
      return { mean: values && values.length === 1 ? values[0] : 0, lower: null, upper: null };
    }
    const n = values.length;
    const mean = values.reduce((a, v) => a + v, 0) / n;
    const sampleVariance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdErr = Math.sqrt(sampleVariance / n);
    const marginOfError = 1.96 * stdErr;
    return {
      mean: parseFloat(mean.toFixed(4)),
      lower: parseFloat((mean - marginOfError).toFixed(4)),
      upper: parseFloat((mean + marginOfError).toFixed(4))
    };
  }

  /**
   * Compute variability (std dev + 95% CI) for KPI-1/2/3 across ≥3 trials.
   *
   * @param {Array<{ablationSignalCount:number, varianceCategoryCount:number, parityScorePercent:number}>} trialResults
   *   Each trial = one runAblation() output count, one getInfraMatrix() variance
   *   category count, and one computeParityScore() output.
   */
  computeVariability(trialResults) {
    if (!Array.isArray(trialResults) || trialResults.length < 3) {
      throw new Error('computeVariability requires an array of at least 3 trial results.');
    }

    const ablationCounts = trialResults.map(t => t.ablationSignalCount);
    const varianceCategoryCounts = trialResults.map(t => t.varianceCategoryCount);
    const parityScores = trialResults.map(t => t.parityScorePercent);

    return {
      trialsUsed: trialResults.length,
      // KPI-1 proxy: number of distinct signals surviving ablation (leakage-point stability)
      kpi1_ablationSignalCount: {
        values: ablationCounts,
        stdDev: this._stdDev(ablationCounts),
        confidenceInterval95: this._confidenceInterval95(ablationCounts)
      },
      // KPI-2: number of quantified variance categories
      kpi2_varianceCategoryCount: {
        values: varianceCategoryCounts,
        stdDev: this._stdDev(varianceCategoryCounts),
        confidenceInterval95: this._confidenceInterval95(varianceCategoryCounts)
      },
      // KPI-3: behavioural parity score percentage
      kpi3_parityScorePercent: {
        values: parityScores,
        stdDev: this._stdDev(parityScores),
        confidenceInterval95: this._confidenceInterval95(parityScores)
      }
    };
  }

  /**
   * Run ≥3 independent trials against live DB data and compute variability.
   * @param {string} tenantId
   * @param {number} [trialCount=3]
   * @param {string} [partition='dev']
   */
  async runTrials(tenantId, trialCount = 3, partition = 'dev') {
    if (trialCount < 3) {
      throw new Error('KPI-4 requires at least 3 trials.');
    }

    const trials = [];
    for (let i = 0; i < trialCount; i++) {
      const { ablationResults } = await infraDiffEngine.runAblation(tenantId, partition);
      const matrix = await infraDiffEngine.getInfraMatrix(tenantId);
      const parity = await comparisonEngine.computeParityScore(tenantId);

      trials.push({
        trialIndex: i + 1,
        ablationSignalCount: ablationResults.length,
        varianceCategoryCount: matrix.length,
        parityScorePercent: parity.parityScorePercent,
        parityRunsUsed: parity.runsUsed
      });
    }

    const variability = this.computeVariability(trials);

    const evidence = await evidenceWriter.write({
      runType: 'repeatability',
      partition,
      provider: null,
      generatedBy: 'server/services/repeatabilityEngine.js',
      data: { tenantId, trialCount, trials, variability, timestamp: new Date().toISOString() }
    });

    return { trials, variability, evidenceRunId: evidence.runId, filePath: evidence.filePath };
  }
}

module.exports = new RepeatabilityEngine();
