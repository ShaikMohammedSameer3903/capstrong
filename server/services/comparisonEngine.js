// ============================================================
// Comparison Engine — CLOUD-223 Capstone
//
// REFACTORED: All values are now computed at query time from:
//   1. deployment_metrics table (actual deployment measurements)
//   2. evidence_runs table / evidence/runs/*.json files
//
// ZERO hardcoded winners, radar data, or summary objects.
// Every numeric value traces to a stored evidence record.
// ============================================================

const { getDatabase } = require('../db/database');
const evidenceWriter = require('./evidenceWriter');

class ComparisonEngine {
  /**
   * Run cross-cloud behavior comparison matrix.
   * Winners and radar data are computed dynamically from stored metrics.
   */
  async getBehaviourComparison(tenantId) {
    const db = await getDatabase();

    // ── 1. Fetch comparison_results rows (populated by infraDiffEngine / deployment runs) ──
    const rows = await db.all(`
      SELECT * FROM comparison_results WHERE tenant_id = ? ORDER BY id ASC
    `, [tenantId]);

    const metrics = rows.map(r => ({
      category: r.metric_category,
      azure: r.azure_value,
      aws: r.aws_value,
      gcp: r.gcp_value,
      winner: r.winner,
      unit: r.unit
    }));

    // ── 2. Fetch deployment_metrics for real provider-level aggregates ──
    const deployMetrics = await db.all(`
      SELECT dm.target_cloud,
             AVG(dm.cpu_usage_avg) as avg_cpu,
             AVG(dm.memory_mb_avg) as avg_memory,
             AVG(dm.latency_ms) as avg_latency,
             AVG(dm.storage_read_mbps) as avg_storage,
             AVG(dm.container_startup_sec) as avg_startup,
             COUNT(*) as deployment_count
      FROM deployment_metrics dm
      JOIN deployments d ON dm.deployment_id = d.id
      WHERE d.tenant_id = ?
      GROUP BY dm.target_cloud
    `, [tenantId]);

    // ── 3. Compute winners dynamically from actual data ──
    const winners = this._computeWinners(deployMetrics, metrics);

    // ── 4. Compute radar data dynamically ──
    const radarData = this._computeRadarData(deployMetrics);

    // ── 5. Fetch evidence run IDs backing this comparison ──
    const evidenceRuns = await db.all(`
      SELECT run_id, file_path, generated_at FROM evidence_runs
      WHERE run_type IN ('deployment', 'diff')
      ORDER BY generated_at DESC LIMIT 10
    `);

    return {
      metrics,
      winners,
      radarData,
      evidenceBacking: evidenceRuns.map(r => ({ runId: r.run_id, file: r.file_path })),
      deploymentSampleSize: deployMetrics.reduce((sum, d) => sum + d.deployment_count, 0),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Compute winners from actual deployment metrics.
   * If no data exists, returns explicit "Insufficient data" — never a fabricated name.
   */
  _computeWinners(deployMetrics, comparisonRows) {
    if (!deployMetrics || deployMetrics.length === 0) {
      return {
        overallWinner: 'Insufficient data — run deployments to generate metrics',
        bestProvider: 'No deployments recorded',
        bestCost: 'No cost data available',
        fastestDeployment: 'No deployment timing data',
        lowestStartup: 'No startup time data'
      };
    }

    // Score each provider: lower latency = better, lower CPU = more efficient, lower startup = faster
    const scored = deployMetrics.map(d => {
      const cloud = (d.target_cloud || '').toUpperCase();
      // Composite score: weight latency(40%), startup(30%), CPU efficiency(30%)
      const latencyScore = d.avg_latency > 0 ? (100 / d.avg_latency) * 40 : 0;
      const startupScore = d.avg_startup > 0 ? (100 / d.avg_startup) * 30 : 0;
      const cpuScore = d.avg_cpu > 0 ? ((100 - d.avg_cpu) / 100) * 30 : 0;
      return {
        cloud,
        compositeScore: latencyScore + startupScore + cpuScore,
        avgLatency: d.avg_latency,
        avgStartup: d.avg_startup,
        avgCpu: d.avg_cpu,
        avgMemory: d.avg_memory,
        deploymentCount: d.deployment_count
      };
    });

    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    const best = scored[0];
    const fastestByStartup = [...scored].sort((a, b) => a.avgStartup - b.avgStartup)[0];
    const fastestByLatency = [...scored].sort((a, b) => a.avgLatency - b.avgLatency)[0];

    // Also check comparison_results rows for cost winner
    const costRows = comparisonRows.filter(r => (r.category || '').toLowerCase().includes('cost'));
    let bestCost = 'No cost data available';
    if (costRows.length > 0) {
      const costRow = costRows[0];
      const costMap = { Azure: costRow.azure, AWS: costRow.aws, GCP: costRow.gcp };
      const lowestCostProvider = Object.entries(costMap).sort((a, b) => a[1] - b[1])[0];
      bestCost = `${lowestCostProvider[0]} ($${lowestCostProvider[1]}/${costRow.unit || 'mo'})`;
    }

    return {
      overallWinner: best.cloud,
      bestProvider: `${best.cloud} (composite score: ${best.compositeScore.toFixed(1)}, n=${best.deploymentCount})`,
      bestCost,
      fastestDeployment: `${fastestByLatency.cloud} (${fastestByLatency.avgLatency.toFixed(1)}ms avg latency)`,
      lowestStartup: `${fastestByStartup.cloud} (${fastestByStartup.avgStartup.toFixed(1)}s avg cold start)`
    };
  }

  /**
   * Compute radar chart data from deployment_metrics.
   * Normalizes each dimension to 0-100 scale based on observed range.
   */
  _computeRadarData(deployMetrics) {
    if (!deployMetrics || deployMetrics.length === 0) {
      return [];
    }

    const dimensions = [
      { metric: 'CPU Efficiency', key: 'avg_cpu', invert: true },     // lower CPU usage = better
      { metric: 'Memory Optim', key: 'avg_memory', invert: true },    // lower memory = better
      { metric: 'Network Speed', key: 'avg_latency', invert: true },  // lower latency = better
      { metric: 'Storage Speed', key: 'avg_storage', invert: false }, // higher IOPS = better
      { metric: 'Availability', key: 'deployment_count', invert: false },
      { metric: 'Startup Speed', key: 'avg_startup', invert: true }   // lower startup = better
    ];

    return dimensions.map(dim => {
      const point = { metric: dim.metric };
      const values = deployMetrics.map(d => d[dim.key] || 0);
      const maxVal = Math.max(...values, 1);
      const minVal = Math.min(...values, 0);
      const range = maxVal - minVal || 1;

      deployMetrics.forEach(d => {
        const cloud = (d.target_cloud || 'unknown').charAt(0).toUpperCase() + (d.target_cloud || 'unknown').slice(1);
        const raw = d[dim.key] || 0;
        // Normalize to 0-100; invert if lower-is-better
        const normalized = dim.invert
          ? Math.round(((maxVal - raw) / range) * 100)
          : Math.round(((raw - minVal) / range) * 100);
        point[cloud] = Math.max(0, Math.min(100, normalized));
      });

      return point;
    });
  }

  /**
   * Compute a real, DB-derived Behavioural Parity Score (KPI-3).
   *
   * A "batch" is a set of ≥2 Completed deployments of the same application,
   * to different target clouds, that carry recorded deployment_metrics.
   * A batch is "behaviourally equivalent" if every compared signal
   * (cpu, memory, latency, storage, startup) stays within `tolerancePercent`
   * of the batch's cross-provider mean for that signal.
   *
   * @param {string} tenantId
   * @param {number} [minRuns=3] — minimum number of multi-provider batches required
   * @param {number} [tolerancePercent=10] — allowed % deviation from the mean per signal
   * @returns {Promise<{parityScorePercent:number, runsUsed:number, stdDev:number, batches:Array, meetsMinRuns:boolean}>}
   */
  async computeParityScore(tenantId, minRuns = 3, tolerancePercent = 10) {
    const db = await getDatabase();

    // ── 1. Find applications with ≥2 distinct completed target_cloud deployments ──
    const batchApps = await db.all(`
      SELECT d.application_id, COUNT(DISTINCT d.target_cloud) as provider_count
      FROM deployments d
      WHERE d.tenant_id = ? AND d.status = 'Completed'
      GROUP BY d.application_id
      HAVING provider_count >= 2
      ORDER BY d.application_id ASC
    `, [tenantId]);

    const signals = [
      { key: 'avg_cpu', label: 'cpu' },
      { key: 'avg_memory', label: 'memory' },
      { key: 'avg_latency', label: 'latency' },
      { key: 'avg_storage', label: 'storage' },
      { key: 'avg_startup', label: 'startup' }
    ];

    const batches = [];

    for (const b of batchApps) {
      // ── 2. Per-provider average metrics for this application's completed deployments ──
      const rows = await db.all(`
        SELECT d.target_cloud,
               AVG(dm.cpu_usage_avg) as avg_cpu,
               AVG(dm.memory_mb_avg) as avg_memory,
               AVG(dm.latency_ms) as avg_latency,
               AVG(dm.storage_read_mbps) as avg_storage,
               AVG(dm.container_startup_sec) as avg_startup,
               COUNT(*) as sample_count
        FROM deployments d
        JOIN deployment_metrics dm ON dm.deployment_id = d.id
        WHERE d.application_id = ? AND d.tenant_id = ? AND d.status = 'Completed'
        GROUP BY d.target_cloud
      `, [b.application_id, tenantId]);

      if (rows.length < 2) continue; // no metrics recorded for enough providers — not a usable batch

      const signalResults = signals.map(sig => {
        const values = rows
          .map(r => r[sig.key])
          .filter(v => v !== null && v !== undefined);
        const mean = values.reduce((a, v) => a + v, 0) / values.length;
        const maxDeviationPercent = mean !== 0
          ? Math.max(...values.map(v => Math.abs(v - mean) / mean)) * 100
          : 0;
        return {
          signal: sig.label,
          providerValues: rows.map(r => ({ cloud: r.target_cloud, value: r[sig.key] })),
          mean: parseFloat(mean.toFixed(3)),
          maxDeviationPercent: parseFloat(maxDeviationPercent.toFixed(2)),
          withinTolerance: maxDeviationPercent <= tolerancePercent
        };
      });

      const equivalent = signalResults.every(s => s.withinTolerance);

      batches.push({
        applicationId: b.application_id,
        providers: rows.map(r => r.target_cloud),
        providerCount: rows.length,
        signalResults,
        equivalent
      });
    }

    const runsUsed = batches.length;
    const batchScores = batches.map(b => (b.equivalent ? 100 : 0));
    const parityScorePercent = runsUsed > 0
      ? parseFloat((batchScores.reduce((a, v) => a + v, 0) / runsUsed).toFixed(2))
      : 0;
    const stdDev = this._stdDevOf(batchScores);
    const meetsMinRuns = runsUsed >= minRuns;

    const evidence = await evidenceWriter.write({
      runType: 'parity',
      partition: 'dev',
      provider: null,
      generatedBy: 'server/services/comparisonEngine.js',
      data: {
        tenantId,
        minRuns,
        tolerancePercent,
        runsUsed,
        meetsMinRuns,
        parityScorePercent,
        stdDev,
        batches,
        timestamp: new Date().toISOString()
      }
    });

    return {
      parityScorePercent,
      runsUsed,
      stdDev,
      batches,
      meetsMinRuns,
      evidenceRunId: evidence.runId,
      filePath: evidence.filePath
    };
  }

  /** Population standard deviation of a numeric array. */
  _stdDevOf(values) {
    if (!values || values.length === 0) return 0;
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
    return parseFloat(Math.sqrt(variance).toFixed(4));
  }
}

module.exports = new ComparisonEngine();
