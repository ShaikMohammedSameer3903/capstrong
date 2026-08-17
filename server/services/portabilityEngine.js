// ============================================================
// Multi-Cloud Portability & Behavioral Comparison Engine
// KL University CLOUD-223 Requirements (O2, O3, O4, O5)
//
// DATA HONESTY CONTRACT:
//   Every metric row and every composite score is either computed from
//   real `deployments` rows for this application, or explicitly marked
//   NOT_MEASURED / INSUFFICIENT_DATA. Nothing falls back to a hand-picked
//   "typical" literal (this file previously did — see CLOUD-223 gap audit,
//   section 3). The header comment ("ZERO MOCK POLICY... from actual
//   telemetry") is now actually true of the code below it.
//
//   NOTE: the real `deployments` schema only has target_cloud, status,
//   duration_ms, created_at/updated_at — there is no per-deployment
//   cpu/memory/latency/rto column. Prior versions of this file queried
//   columns (d.provider, d.duration_sec, d.cpu_avg, d.rto_sec) that do not
//   exist in schema.sql, so that "real data" branch was silently dead code
//   and every run fell through to the hardcoded constants. That mismatch is
//   fixed here: this file now reads only columns that actually exist, and
//   is explicit about which portability factors it cannot compute without
//   the deployment_metrics telemetry (see infraDiffEngine.js) being joined
//   in a future pass.
// ============================================================

const { getDatabase } = require('../db/database');

const SUCCESS_STATUSES = ['Completed', 'Running'];
const FAILURE_STATUSES = ['Failed', 'Rollback', 'Terminated'];

class PortabilityEngine {
  /**
   * Run portability analysis for an application across Azure, AWS, GCP.
   * Returns INSUFFICIENT_DATA scores (not fabricated numbers) when an
   * application has no recorded deployments at all.
   *
   * CLOUD-223 Phase 1B correction: a missing applicationId is no longer
   * silently papered over by inserting a placeholder "Target Application"
   * row with container_image 'sample-app:latest'. That row never existed,
   * so any score built on top of it would be portability data about a
   * fabricated application, not this one. Instead an explicit
   * APPLICATION_NOT_FOUND result is returned and analysis stops.
   */
  async analyzePortability(applicationId, tenantId) {
    const db = await getDatabase();

    const appRow = await db.get(`SELECT * FROM applications WHERE id = ?`, [applicationId]);
    if (!appRow) {
      return {
        applicationId,
        appName: null,
        status: 'APPLICATION_NOT_FOUND',
        reason: `No application with id '${applicationId}' exists. Register/deploy the application first — portability analysis does not create placeholder applications.`,
        scores: null,
        scoreExplanation: null,
        metricsComparison: null,
        evaluatedClouds: [],
        evaluatedAt: new Date().toISOString()
      };
    }
    const appName = appRow.name;

    // 1. Query real deployments for this application, using the columns
    //    that actually exist on `deployments` (target_cloud, status, duration_ms).
    const deployments = await db.all(`
      SELECT * FROM deployments
      WHERE (application_id = ? OR ? IS NULL) AND (tenant_id = ? OR ? IS NULL)
    `, [applicationId, applicationId, tenantId, tenantId]);

    // Optional: real per-provider performance telemetry, if any deployment
    // in this set has recorded deployment_metrics rows.
    const deploymentIds = deployments.map(d => d.id);
    let metricsRows = [];
    if (deploymentIds.length > 0) {
      const placeholders = deploymentIds.map(() => '?').join(',');
      metricsRows = await db.all(`
        SELECT target_cloud,
               AVG(cpu_usage_avg) as avg_cpu,
               AVG(memory_mb_avg) as avg_memory,
               AVG(latency_ms) as avg_latency,
               AVG(storage_read_mbps) as avg_storage,
               COUNT(*) as sample_count
        FROM deployment_metrics
        WHERE deployment_id IN (${placeholders})
        GROUP BY target_cloud
      `, deploymentIds);
    }
    const metricsByCloud = {};
    metricsRows.forEach(m => { metricsByCloud[(m.target_cloud || '').toLowerCase()] = m; });

    const providerStats = {
      azure: { deployTimesMs: [], count: 0, succeeded: 0, failed: 0 },
      aws:   { deployTimesMs: [], count: 0, succeeded: 0, failed: 0 },
      gcp:   { deployTimesMs: [], count: 0, succeeded: 0, failed: 0 }
    };

    deployments.forEach(d => {
      const p = (d.target_cloud || '').toLowerCase();
      if (!providerStats[p]) return;
      providerStats[p].count++;
      if (SUCCESS_STATUSES.includes(d.status)) providerStats[p].succeeded++;
      if (FAILURE_STATUSES.includes(d.status)) providerStats[p].failed++;
      if (d.duration_ms) providerStats[p].deployTimesMs.push(d.duration_ms);
    });

    const avgOrNull = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    // Build the metrics comparison table. Each row is NOT_MEASURED per
    // provider unless there is real data behind it.
    const providers = ['azure', 'aws', 'gcp'];
    const cell = (value, unit, decimals = 1) => value == null ? 'NOT_MEASURED' : `${value.toFixed(decimals)} ${unit}`.trim();

    const deployDurations = {};
    providers.forEach(p => { deployDurations[p] = avgOrNull(providerStats[p].deployTimesMs); });

    const metricsComparison = [
      {
        metric: 'Deployment Duration',
        azure: cell(deployDurations.azure != null ? deployDurations.azure / 1000 : null, 's'),
        aws: cell(deployDurations.aws != null ? deployDurations.aws / 1000 : null, 's'),
        gcp: cell(deployDurations.gcp != null ? deployDurations.gcp / 1000 : null, 's'),
        status: providers.some(p => deployDurations[p] != null) ? 'MEASURED' : 'INSUFFICIENT_DATA',
        source: 'deployments.duration_ms (real recorded rows)'
      },
      {
        metric: 'CPU Utilization Avg',
        azure: cell(metricsByCloud.azure?.avg_cpu, '% avg utilization'),
        aws: cell(metricsByCloud.aws?.avg_cpu, '% avg utilization'),
        gcp: cell(metricsByCloud.gcp?.avg_cpu, '% avg utilization'),
        status: providers.some(p => metricsByCloud[p]) ? 'MEASURED' : 'NOT_MEASURED',
        source: 'deployment_metrics.cpu_usage_avg (real, requires telemetry)'
      },
      {
        metric: 'Memory Allocation',
        azure: cell(metricsByCloud.azure?.avg_memory, 'MB', 0),
        aws: cell(metricsByCloud.aws?.avg_memory, 'MB', 0),
        gcp: cell(metricsByCloud.gcp?.avg_memory, 'MB', 0),
        status: providers.some(p => metricsByCloud[p]) ? 'MEASURED' : 'NOT_MEASURED',
        source: 'deployment_metrics.memory_mb_avg (real, requires telemetry)'
      },
      {
        metric: 'Network Latency',
        azure: cell(metricsByCloud.azure?.avg_latency, 'ms'),
        aws: cell(metricsByCloud.aws?.avg_latency, 'ms'),
        gcp: cell(metricsByCloud.gcp?.avg_latency, 'ms'),
        status: providers.some(p => metricsByCloud[p]) ? 'MEASURED' : 'NOT_MEASURED',
        source: 'deployment_metrics.latency_ms (real, requires telemetry)'
      },
      {
        metric: 'Storage Performance',
        azure: cell(metricsByCloud.azure?.avg_storage, 'MB/s'),
        aws: cell(metricsByCloud.aws?.avg_storage, 'MB/s'),
        gcp: cell(metricsByCloud.gcp?.avg_storage, 'MB/s'),
        status: providers.some(p => metricsByCloud[p]) ? 'MEASURED' : 'NOT_MEASURED',
        source: 'deployment_metrics.storage_read_mbps (real, requires telemetry)'
      },
      {
        metric: 'Availability SLA',
        azure: 'NOT_MEASURED', aws: 'NOT_MEASURED', gcp: 'NOT_MEASURED',
        status: 'NOT_MEASURED',
        source: 'No uptime-monitoring source is wired into this project — SLA cannot be claimed without one.'
      },
      {
        metric: 'Recovery Time (RTO)',
        azure: 'NOT_MEASURED', aws: 'NOT_MEASURED', gcp: 'NOT_MEASURED',
        status: 'NOT_MEASURED',
        source: 'No fault-injection/recovery timer is recorded per deployment yet.'
      },
      {
        metric: 'Deployment Success Rate',
        azure: providerStats.azure.count ? `${Math.round((providerStats.azure.succeeded / providerStats.azure.count) * 100)}% (n=${providerStats.azure.count})` : 'NOT_MEASURED',
        aws: providerStats.aws.count ? `${Math.round((providerStats.aws.succeeded / providerStats.aws.count) * 100)}% (n=${providerStats.aws.count})` : 'NOT_MEASURED',
        gcp: providerStats.gcp.count ? `${Math.round((providerStats.gcp.succeeded / providerStats.gcp.count) * 100)}% (n=${providerStats.gcp.count})` : 'NOT_MEASURED',
        status: providers.some(p => providerStats[p].count > 0) ? 'MEASURED' : 'INSUFFICIENT_DATA',
        source: 'deployments.status (real recorded rows) — never assumed 100%'
      },
      {
        metric: 'Configuration Drift',
        azure: 'NOT_MEASURED', aws: 'NOT_MEASURED', gcp: 'NOT_MEASURED',
        status: 'NOT_MEASURED',
        source: 'No config-drift detector is wired into this project yet.'
      }
    ];

    // Compute portability scores only from what is actually measurable today:
    // deployment success consistency. Every other named factor in the
    // conceptual breakdown (infra compatibility, behavioral parity, leakage,
    // migration risk) is reported as NOT_FACTORED_IN rather than folded into
    // the number via made-up multipliers (0.95/0.98/0.92), because there is
    // no real signal behind those multipliers today.
    const totalDeployments = deployments.length;
    const successfulDeployments = deployments.filter(d => SUCCESS_STATUSES.includes(d.status)).length;

    let scores;
    let scoreExplanation;
    if (totalDeployments === 0) {
      scores = {
        portabilityScore: 'INSUFFICIENT_DATA',
        providerCompatibilityScore: 'INSUFFICIENT_DATA',
        performanceScore: 'INSUFFICIENT_DATA',
        deploymentConsistencyScore: 'INSUFFICIENT_DATA'
      };
      scoreExplanation = {
        status: 'INSUFFICIENT_DATA',
        reason: `No deployments recorded for application ${applicationId}. Deploy to at least one provider to produce a score.`,
        factorsConsidered: [],
        factorsNotAvailable: ['infrastructure compatibility', 'behavioral parity', 'detected leakage', 'migration risk']
      };
    } else {
      const deploymentConsistencyScore = Math.round((successfulDeployments / totalDeployments) * 100);
      scores = {
        portabilityScore: deploymentConsistencyScore,
        providerCompatibilityScore: deploymentConsistencyScore,
        performanceScore: 'NOT_FACTORED_IN',
        deploymentConsistencyScore
      };
      scoreExplanation = {
        status: 'PARTIAL',
        reason: `Score reflects deployment-success consistency only: ${successfulDeployments}/${totalDeployments} deployments reached a success status (${SUCCESS_STATUSES.join('/')}).`,
        factorsConsidered: ['deployment success/failure consistency across recorded deployments'],
        factorsNotAvailable: [
          'infrastructure compatibility (requires deployment_metrics coverage across all 3 providers)',
          'behavioral parity (requires application-level behavioral test results)',
          'detected infrastructure leakage (see infraDiffEngine.getInfraMatrix — join when available)',
          'migration/portability risk (no dependency/config-portability analyzer wired in yet)'
        ],
        note: 'providerCompatibilityScore intentionally mirrors deploymentConsistencyScore today — they are not yet independently measured factors.'
      };
    }

    // Store in database
    await db.run(`
      INSERT OR REPLACE INTO portability_scores (
        id, application_id, tenant_id, portability_score, compatibility_score,
        performance_score, consistency_score, evaluated_clouds, drift_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      `port-${applicationId}`, applicationId, tenantId,
      typeof scores.portabilityScore === 'number' ? scores.portabilityScore : null,
      typeof scores.providerCompatibilityScore === 'number' ? scores.providerCompatibilityScore : null,
      typeof scores.performanceScore === 'number' ? scores.performanceScore : null,
      typeof scores.deploymentConsistencyScore === 'number' ? scores.deploymentConsistencyScore : null,
      JSON.stringify(["azure", "aws", "gcp"]),
      JSON.stringify(metricsComparison)
    ]);

    return {
      applicationId,
      appName,
      scores,
      scoreExplanation,
      metricsComparison,
      evaluatedClouds: ["azure", "aws", "gcp"],
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Get summary of all portability reports
   */
  async getPortabilitySummary(tenantId) {
    const db = await getDatabase();
    const rows = await db.all(`
      SELECT p.*, a.name as application_name
      FROM portability_scores p
      JOIN applications a ON p.application_id = a.id
      WHERE p.tenant_id = ?
    `, [tenantId]);

    return rows;
  }

  /**
   * Translate a universal application spec into target cloud primitive definitions
   * @param {Object} appSpec Universal Application Spec
   * @param {string} targetProvider 'aws', 'azure', 'gcp', or 'kubernetes'
   */
  translateAppSpec(appSpec, targetProvider) {
    const name = (appSpec.name || 'unnamed-app').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const image = appSpec.image || 'nginx:latest';
    const port = Number(appSpec.port) || 80;
    const replicas = Number(appSpec.replicas) || 1;
    const env = appSpec.env || {};
    const cpu = appSpec.resources?.cpu || '250m';
    const memory = appSpec.resources?.memory || '512Mi';

    const provider = (targetProvider || 'kubernetes').toLowerCase();

    switch (provider) {
      case 'aws':
        return {
          provider: 'aws',
          targetPrimitive: 'AWS ECS TaskDefinition & Service',
          specification: {
            family: name,
            containerDefinitions: [
              {
                name,
                image,
                portMappings: [{ containerPort: port, hostPort: port }],
                environment: Object.entries(env).map(([k, v]) => ({ name: k, value: String(v) })),
                essential: true
              }
            ],
            cpu: '256',
            memory: '512'
          }
        };

      case 'azure':
        return {
          provider: 'azure',
          targetPrimitive: 'Azure Container App',
          specification: {
            name,
            properties: {
              configuration: {
                ingress: { external: true, targetPort: port }
              },
              template: {
                containers: [{ name, image, env: Object.entries(env).map(([name, value]) => ({ name, value: String(value) })) }],
                scale: { minReplicas: 1, maxReplicas: replicas }
              }
            }
          }
        };

      case 'gcp':
        return {
          provider: 'gcp',
          targetPrimitive: 'GCP Cloud Run Service',
          specification: {
            apiVersion: 'serving.knative.dev/v1',
            kind: 'Service',
            metadata: { name },
            spec: {
              template: {
                spec: {
                  containers: [
                    {
                      image,
                      ports: [{ containerPort: port }],
                      env: Object.entries(env).map(([name, value]) => ({ name, value: String(value) }))
                    }
                  ]
                }
              }
            }
          }
        };

      case 'k8s':
      case 'kubernetes':
      default:
        return {
          provider: 'kubernetes',
          targetPrimitive: 'Kubernetes Deployment & Service Manifest',
          specification: {
            deployment: {
              apiVersion: 'apps/v1',
              kind: 'Deployment',
              metadata: { name, labels: { app: name } },
              spec: {
                replicas,
                selector: { matchLabels: { app: name } },
                template: {
                  metadata: { labels: { app: name } },
                  spec: {
                    containers: [{
                      name,
                      image,
                      ports: [{ containerPort: port }],
                      env: Object.entries(env).map(([name, value]) => ({ name, value: String(value) })),
                      resources: { limits: { cpu, memory } }
                    }]
                  }
                }
              }
            },
            service: {
              apiVersion: 'v1',
              kind: 'Service',
              metadata: { name: `${name}-svc` },
              spec: {
                selector: { app: name },
                ports: [{ port, targetPort: port }]
              }
            }
          }
        };
    }
  }
}

module.exports = new PortabilityEngine();

