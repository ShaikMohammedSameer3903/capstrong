// ============================================================
// Infrastructure Difference Detection Engine — CLOUD-223 (O3)
//
// Detects, quantifies, and analyzes infrastructure differences
// that leak through multi-cloud platform abstractions.
//
// Supports:
//   - Comparative Matrix generation from deployment_metrics & provider specs
//   - Ablation analysis (recomputing leakage with one measured signal excluded)
//   - Sensitivity analysis (variance across recorded concurrency conditions)
//   - Automatic evidence file generation via EvidenceWriter
//
// DATA HONESTY CONTRACT (see CLOUD-223 gap audit, section 6/7):
//   Every category/provider cell is either:
//     - a value computed from deployment_metrics rows for that (provider, category)
//     - the literal 'NOT_MEASURED' when zero rows exist for that provider
//   No category ever falls back to a hand-picked "typical" literal.
//   Ablation/Sensitivity return EXPERIMENT_NOT_AVAILABLE when there is not
//   enough real measurement data to support the analysis, instead of
//   simulating a result.
// ============================================================

const { getDatabase } = require('../db/database');
const evidenceWriter = require('./evidenceWriter');

// Minimum sample rows per provider required before a category is treated
// as "measured" rather than "not enough data yet".
const MIN_SAMPLES_FOR_MEASUREMENT = 1;

// Category definitions: each maps to one deployment_metrics column and
// carries the qualitative leakage rationale from the reference report.
// The rationale text explains *why this dimension matters*; it is never
// a substitute for the measured value itself.
//
// EXTENDED (Phase 2): 10 total dimensions including cost, security,
// compliance, availability, and auto-scaling for broader provider parity.
const CATEGORY_DEFS = [
  {
    key: 'storage',
    category: 'Storage IOPS & Throughput',
    column: 'avg_storage',
    unit: 'MB/s',
    decimals: 1,
    leakageRationale: 'Storage throughput/IOPS ceilings differ by disk SKU and can bottleneck database-bound workloads.'
  },
  {
    key: 'network',
    category: 'Network Policy & Latency',
    column: 'avg_latency',
    unit: 'ms',
    decimals: 1,
    leakageRationale: 'Security-group/NSG connection tracking and regional routing create latency variance.'
  },
  {
    key: 'startup',
    category: 'Compute Startup / Cold-Start',
    column: 'avg_startup',
    unit: 's',
    decimals: 2,
    leakageRationale: 'Container runtime (Firecracker/Hyper-V/gVisor) affects scale-from-zero cold-start timing.'
  },
  {
    key: 'memory',
    category: 'Memory Allocation Efficiency',
    column: 'avg_memory',
    unit: 'MB',
    decimals: 0,
    leakageRationale: 'Host memory accounting/overhead can differ slightly across hypervisors.'
  },
  {
    key: 'cpu',
    category: 'CPU Utilization / Throttling',
    column: 'avg_cpu',
    unit: '% avg utilization',
    decimals: 1,
    leakageRationale: 'vCPU scheduling and throttling behavior differs across hypervisors under sustained load.'
  },
  // ── Phase 2: Broader Provider Parity Dimensions ──
  {
    key: 'cost',
    category: 'Cost Efficiency',
    column: 'avg_cost_per_hour',
    unit: '$/hr',
    decimals: 4,
    leakageRationale: 'Compute pricing, egress costs, and managed-service overhead vary significantly across providers, creating cost asymmetry for identical workloads.'
  },
  {
    key: 'security',
    category: 'Security Posture Score',
    column: 'avg_security_score',
    unit: 'score (0-100)',
    decimals: 1,
    leakageRationale: 'Default security configurations (network policies, encryption, IAM granularity) differ between providers, affecting out-of-box security posture.'
  },
  {
    key: 'compliance',
    category: 'Compliance Adherence',
    column: 'avg_compliance_score',
    unit: 'score (0-100)',
    decimals: 1,
    leakageRationale: 'Built-in compliance frameworks (SOC2, HIPAA, PCI-DSS) vary in coverage and enforcement depth across cloud providers.'
  },
  {
    key: 'availability',
    category: 'Availability / Uptime',
    column: 'avg_uptime_pct',
    unit: '% uptime',
    decimals: 3,
    leakageRationale: 'SLA commitments and actual uptime track records differ between providers and across regions, affecting application reliability.'
  },
  {
    key: 'autoscaling',
    category: 'Auto-Scaling Responsiveness',
    column: 'avg_scale_latency_sec',
    unit: 's',
    decimals: 2,
    leakageRationale: 'Time from scaling trigger to new instance readiness varies by provider orchestrator (ECS vs AKS vs Cloud Run), affecting burst-traffic handling.'
  }
];

const PROVIDERS = ['azure', 'aws', 'gcp'];

function fmt(value, unit, decimals) {
  return `${Number(value).toFixed(decimals)} ${unit}`.trim();
}

class InfraDiffEngine {
  /**
   * Compute infrastructure comparative matrix across providers based on empirical metrics.
   * Cells with no supporting rows are returned as NOT_MEASURED — never a fabricated
   * "typical" literal.
   * @param {string} tenantId
   * @param {object} [opts] - { writeEvidence: boolean, partition: 'dev'|'acceptance' }
   */
  async getInfraMatrix(tenantId, opts = {}) {
    const db = await getDatabase();

    // Try extended query with Phase 2 columns first, fall back to original 5 columns
    let metrics;
    try {
      metrics = await db.all(`
        SELECT dm.target_cloud,
               AVG(dm.cpu_usage_avg) as avg_cpu,
               AVG(dm.memory_mb_avg) as avg_memory,
               AVG(dm.latency_ms) as avg_latency,
               AVG(dm.storage_read_mbps) as avg_storage,
               AVG(dm.container_startup_sec) as avg_startup,
               AVG(dm.cost_per_hour) as avg_cost_per_hour,
               AVG(dm.security_score) as avg_security_score,
               AVG(dm.compliance_score) as avg_compliance_score,
               AVG(dm.uptime_pct) as avg_uptime_pct,
               AVG(dm.scale_latency_sec) as avg_scale_latency_sec,
               COUNT(*) as sample_count
        FROM deployment_metrics dm
        LEFT JOIN deployments d ON dm.deployment_id = d.id
        WHERE d.tenant_id = ? OR ? IS NULL OR d.tenant_id IS NULL
        GROUP BY dm.target_cloud
      `, [tenantId, tenantId]);
    } catch (_) {
      // Fall back to original 5-column query if extended columns don't exist
      metrics = await db.all(`
        SELECT dm.target_cloud,
               AVG(dm.cpu_usage_avg) as avg_cpu,
               AVG(dm.memory_mb_avg) as avg_memory,
               AVG(dm.latency_ms) as avg_latency,
               AVG(dm.storage_read_mbps) as avg_storage,
               AVG(dm.container_startup_sec) as avg_startup,
               COUNT(*) as sample_count
        FROM deployment_metrics dm
        LEFT JOIN deployments d ON dm.deployment_id = d.id
        WHERE d.tenant_id = ? OR ? IS NULL OR d.tenant_id IS NULL
        GROUP BY dm.target_cloud
      `, [tenantId, tenantId]);
    }

    const byCloud = {};
    metrics.forEach(m => {
      byCloud[(m.target_cloud || '').toLowerCase()] = m;
    });

    const totalSamples = metrics.reduce((acc, m) => acc + m.sample_count, 0);

    const matrix = CATEGORY_DEFS.map(def => {
      const row = { category: def.category, leakageRationale: def.leakageRationale, sampleCount: totalSamples };

      PROVIDERS.forEach(provider => {
        const rec = byCloud[provider];
        const hasData = rec && rec.sample_count >= MIN_SAMPLES_FOR_MEASUREMENT && rec[def.column] != null;
        row[provider] = hasData ? fmt(rec[def.column], def.unit, def.decimals) : 'NOT_MEASURED';
      });

      // Only compute an observed magnitude/leakage-impact statement when at
      // least two providers have real measurements to compare.
      const measuredProviders = PROVIDERS.filter(p => row[p] !== 'NOT_MEASURED');
      if (measuredProviders.length >= 2) {
        const values = measuredProviders.map(p => byCloud[p][def.column]);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const spreadPct = min > 0 ? (((max - min) / min) * 100) : null;
        row.leakageImpact = spreadPct != null
          ? `Observed spread across ${measuredProviders.length} provider(s): ${spreadPct.toFixed(1)}% (measured, n=${totalSamples})`
          : `Observed absolute spread across ${measuredProviders.length} provider(s): ${(max - min).toFixed(2)} ${def.unit} (measured, n=${totalSamples})`;
        row.status = 'MEASURED';
      } else {
        row.leakageImpact = 'INSUFFICIENT_DATA — fewer than 2 providers have recorded deployment_metrics for this category';
        row.status = 'INSUFFICIENT_DATA';
      }

      return row;
    });

    if (opts.writeEvidence) {
      await evidenceWriter.write({
        runType: 'diff',
        partition: opts.partition || 'dev',
        provider: null,
        generatedBy: 'server/services/infraDiffEngine.js',
        data: { tenantId, matrix, sampleSize: metrics.length, totalSamples }
      });
    }

    return matrix;
  }

  /**
   * Run Ablation Analysis — recompute the measured cross-provider spread with
   * one signal category excluded from consideration, and compare it against
   * the full (baseline) spread. This is a genuine before/after comparison
   * over *real recorded measurements*; it is not a simulated experiment, and
   * it does not claim to be a live disable-and-redeploy study.
   *
   * If there isn't enough real measurement data to compute a baseline at
   * all, this returns EXPERIMENT_NOT_AVAILABLE rather than inventing a number.
   *
   * @param {string} tenantId
   * @param {string} [partition='dev']
   */
  async runAblation(tenantId, partition = 'dev') {
    const baseMatrix = await this.getInfraMatrix(tenantId);
    const measuredRows = baseMatrix.filter(m => m.status === 'MEASURED');

    if (measuredRows.length === 0) {
      const evidence = await evidenceWriter.write({
        runType: 'ablation',
        partition,
        provider: null,
        generatedBy: 'server/services/infraDiffEngine.js',
        data: {
          tenantId,
          status: 'EXPERIMENT_NOT_AVAILABLE',
          reason: 'No category has measured data from at least 2 providers — cannot compute a baseline to ablate against.',
          timestamp: new Date().toISOString()
        }
      });
      return { status: 'EXPERIMENT_NOT_AVAILABLE', ablationResults: [], evidenceRunId: evidence.runId, filePath: evidence.filePath };
    }

    // Baseline: average measured spread-percent across all measured categories.
    const parseSpreadPct = (row) => {
      const match = /spread.*?:\s*([\d.]+)%/i.exec(row.leakageImpact);
      return match ? parseFloat(match[1]) : null;
    };
    const baselineSpreads = measuredRows.map(parseSpreadPct).filter(v => v != null);
    const baselineAvg = baselineSpreads.length
      ? baselineSpreads.reduce((a, b) => a + b, 0) / baselineSpreads.length
      : null;

    const ablationResults = CATEGORY_DEFS.map(def => {
      const remaining = measuredRows.filter(r => r.category !== def.category);
      const remainingSpreads = remaining.map(parseSpreadPct).filter(v => v != null);
      const ablatedAvg = remainingSpreads.length
        ? remainingSpreads.reduce((a, b) => a + b, 0) / remainingSpreads.length
        : null;

      const wasMeasured = measuredRows.some(r => r.category === def.category);

      if (!wasMeasured || baselineAvg == null) {
        return {
          ablatedSignal: def.key,
          category: def.category,
          status: 'EXPERIMENT_NOT_AVAILABLE',
          reason: 'This category has no baseline measurement to ablate.'
        };
      }

      const delta = ablatedAvg == null ? null : (baselineAvg - ablatedAvg);

      return {
        ablatedSignal: def.key,
        category: def.category,
        status: 'MEASURED',
        baselineAvgSpreadPercent: parseFloat(baselineAvg.toFixed(2)),
        ablatedAvgSpreadPercent: ablatedAvg == null ? null : parseFloat(ablatedAvg.toFixed(2)),
        deltaPercent: delta == null ? null : parseFloat(delta.toFixed(2)),
        interpretation: delta == null
          ? 'Removing this signal leaves no other measured categories to compare — impact indeterminate.'
          : `Removing ${def.category} shifts average measured cross-provider spread by ${delta.toFixed(2)} percentage points.`,
        dataSource: 'deployment_metrics (real recorded rows)',
        executionMode: 'RECOMPUTED_FROM_RECORDED_MEASUREMENTS'
      };
    });

    const evidence = await evidenceWriter.write({
      runType: 'ablation',
      partition,
      provider: null,
      generatedBy: 'server/services/infraDiffEngine.js',
      data: { tenantId, baselineAvgSpreadPercent: baselineAvg, ablationResults, timestamp: new Date().toISOString() }
    });

    return { status: 'MEASURED', ablationResults, evidenceRunId: evidence.runId, filePath: evidence.filePath };
  }

  /**
   * Run Sensitivity Analysis across recorded concurrency conditions.
   *
   * @param {string} tenantId
   * @param {string} [partition='dev']
   */
  async runSensitivity(tenantId, partition = 'dev') {
    const db = await getDatabase();

    let hasConcurrencyData = false;
    try {
      const cols = await db.all(`PRAGMA table_info(deployment_metrics)`);
      hasConcurrencyData = cols.some(c => c.name === 'concurrency');
    } catch (e) {
      hasConcurrencyData = false;
    }

    if (!hasConcurrencyData) {
      const evidence = await evidenceWriter.write({
        runType: 'sensitivity',
        partition,
        provider: null,
        generatedBy: 'server/services/infraDiffEngine.js',
        data: {
          tenantId,
          status: 'EXPERIMENT_NOT_AVAILABLE',
          reason: 'No concurrency-sweep load-test data is recorded (deployment_metrics has no concurrency dimension). ' +
                  'A real sensitivity result requires a load-test harness that records per-concurrency latency samples.',
          timestamp: new Date().toISOString()
        }
      });
      return { status: 'EXPERIMENT_NOT_AVAILABLE', sensitivityResults: [], evidenceRunId: evidence.runId, filePath: evidence.filePath };
    }

    const rows = await db.all(`
      SELECT dm.target_cloud, dm.concurrency, AVG(dm.latency_ms) as avg_latency, COUNT(*) as sample_count
      FROM deployment_metrics dm
      LEFT JOIN deployments d ON dm.deployment_id = d.id
      WHERE d.tenant_id = ? OR ? IS NULL OR d.tenant_id IS NULL
      GROUP BY dm.target_cloud, dm.concurrency
      ORDER BY dm.concurrency ASC
    `, [tenantId, tenantId]);

    const evidence = await evidenceWriter.write({
      runType: 'sensitivity',
      partition,
      provider: null,
      generatedBy: 'server/services/infraDiffEngine.js',
      data: { tenantId, status: rows.length ? 'MEASURED' : 'INSUFFICIENT_DATA', sensitivityResults: rows, timestamp: new Date().toISOString() }
    });

    return { status: rows.length ? 'MEASURED' : 'INSUFFICIENT_DATA', sensitivityResults: rows, evidenceRunId: evidence.runId, filePath: evidence.filePath };
  }
}

module.exports = new InfraDiffEngine();
