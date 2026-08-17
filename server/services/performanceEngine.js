// ============================================================
// Multi-Cloud Performance Comparison Engine
// REFACTORED: All values computed from deployment_metrics table.
// No hardcoded PROVIDER_PROFILES. Returns zeros/empty when no data.
// ============================================================

const { getDatabase } = require('../db/database');

const PROVIDER_NAMES = {
  azure: 'Microsoft Azure',
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud Platform'
};

const METRIC_KEYS = ['cpu', 'memory', 'disk', 'iops', 'latency', 'availability', 'network', 'responseTime', 'storageUsage', 'runningCost'];

/**
 * Build a provider profile from deployment_metrics rows.
 * Maps raw avg values to a 0-100 normalised score.
 */
function buildProfile(name, dm) {
  // dm = { avg_cpu, avg_memory, avg_latency, avg_storage, avg_startup, deploy_count, total_cost }
  if (!dm) {
    const empty = { name };
    METRIC_KEYS.forEach(k => { empty[k] = { value: 0, display: 'No data', status: 'Inactive' }; });
    empty.overallScore = 0;
    return empty;
  }

  // Normalise each dimension to 0-100. Lower-is-better dims are inverted.
  const cpu      = Math.max(0, Math.min(100, Math.round(100 - (dm.avg_cpu || 0))));
  const memory   = Math.max(0, Math.min(100, Math.round(100 - ((dm.avg_memory || 0) / 10240) * 100)));
  const latency  = Math.max(0, Math.min(100, dm.avg_latency > 0 ? Math.round(100 - Math.min(dm.avg_latency, 100)) : 0));
  const storage  = Math.max(0, Math.min(100, Math.round(Math.min((dm.avg_storage || 0) / 5, 100))));
  const startup  = Math.max(0, Math.min(100, dm.avg_startup > 0 ? Math.round(100 - Math.min(dm.avg_startup * 10, 100)) : 0));
  const count    = dm.deploy_count || 0;
  const cost     = dm.total_cost || 0;

  const profile = {
    name,
    cpu:          { value: cpu,     display: `${(dm.avg_cpu || 0).toFixed(1)}% avg CPU (n=${count})`, status: cpu > 50 ? 'Optimal' : 'Warning' },
    memory:       { value: memory,  display: `${(dm.avg_memory || 0).toFixed(0)} MB avg (n=${count})`, status: memory > 50 ? 'Optimal' : 'Warning' },
    disk:         { value: storage, display: `${(dm.avg_storage || 0).toFixed(1)} MB/s read (n=${count})`, status: storage > 50 ? 'Optimal' : 'Warning' },
    iops:         { value: storage, display: `${(dm.avg_storage || 0).toFixed(1)} MB/s (derived)`, status: storage > 50 ? 'Optimal' : 'Warning' },
    latency:      { value: latency, display: `${(dm.avg_latency || 0).toFixed(1)}ms avg (n=${count})`, status: latency > 50 ? 'Optimal' : 'Warning' },
    availability: { value: Math.min(100, count * 10), display: `${count} successful deployments`, status: count > 0 ? 'Optimal' : 'Inactive' },
    network:      { value: latency, display: `${(dm.avg_latency || 0).toFixed(1)}ms (derived from latency)`, status: latency > 50 ? 'Optimal' : 'Warning' },
    responseTime: { value: latency, display: `${(dm.avg_latency || 0).toFixed(1)}ms (derived)`, status: latency > 50 ? 'Optimal' : 'Warning' },
    storageUsage: { value: storage, display: `${(dm.avg_storage || 0).toFixed(1)} MB/s (derived)`, status: storage > 50 ? 'Optimal' : 'Warning' },
    runningCost:  { value: cost > 0 ? Math.max(0, Math.round(100 - cost)) : 0, display: cost > 0 ? `$${cost.toFixed(2)} total recorded` : 'No cost data', status: cost < 100 ? 'Optimal' : 'Warning' }
  };

  const vals = METRIC_KEYS.map(k => profile[k].value);
  profile.overallScore = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  return profile;
}

/**
 * Gets comparison metrics for Azure, AWS, and GCP — purely from deployment_metrics.
 */
async function getComparison(tenantId) {
  const db = await getDatabase();
  const providers = ['azure', 'aws', 'gcp'];

  // Aggregate real deployment_metrics per provider
  const rows = await db.all(`
    SELECT dm.target_cloud,
           AVG(dm.cpu_usage_avg)         as avg_cpu,
           AVG(dm.memory_mb_avg)         as avg_memory,
           AVG(dm.latency_ms)            as avg_latency,
           AVG(dm.storage_read_mbps)     as avg_storage,
           AVG(dm.container_startup_sec) as avg_startup,
           COUNT(*)                      as deploy_count
    FROM deployment_metrics dm
    JOIN deployments d ON dm.deployment_id = d.id
    WHERE d.tenant_id = ?
    GROUP BY dm.target_cloud
  `, [tenantId]);

  // Also pull cost data
  const costRows = await db.all(`
    SELECT LOWER(r.provider) as prov, SUM(r.cost_impact) as total_cost
    FROM resources r WHERE r.tenant_id = ? GROUP BY LOWER(r.provider)
  `, [tenantId]);
  const costMap = {};
  costRows.forEach(c => { costMap[c.prov] = c.total_cost; });

  const dmMap = {};
  rows.forEach(r => {
    dmMap[r.target_cloud] = { ...r, total_cost: costMap[r.target_cloud] || 0 };
  });

  const results = {};
  providers.forEach(prov => {
    results[prov] = buildProfile(PROVIDER_NAMES[prov], dmMap[prov] || null);
  });

  const rankingList = providers.map(prov => ({
    provider: prov,
    name: results[prov].name,
    score: results[prov].overallScore
  })).sort((a, b) => b.score - a.score);

  const bestProv = rankingList[0].provider;
  const bestScore = rankingList[0].score;

  return {
    comparison: results,
    rankings: rankingList.map((r, i) => ({ ...r, rank: i + 1 })),
    bestProvider: {
      provider: bestProv,
      name: results[bestProv].name,
      score: bestScore,
      summary: bestScore > 0
        ? `${PROVIDER_NAMES[bestProv]} leads with score ${bestScore}/100 based on ${dmMap[bestProv]?.deploy_count || 0} deployments.`
        : 'No deployments recorded — run deployments to generate comparison data.',
      rationale: bestScore > 0
        ? `Score computed from deployment_metrics: CPU ${(dmMap[bestProv]?.avg_cpu || 0).toFixed(1)}%, latency ${(dmMap[bestProv]?.avg_latency || 0).toFixed(1)}ms, startup ${(dmMap[bestProv]?.avg_startup || 0).toFixed(2)}s.`
        : 'Insufficient data.'
    }
  };
}

/**
 * 30-Day performance index trends — from cloud_performance_history table only
 */
async function getTrends(tenantId) {
  const db = await getDatabase();
  const history = await db.all(`
    SELECT provider, date(timestamp) as date_day, AVG(metric_score) as avg_score
    FROM cloud_performance_history
    WHERE tenant_id = ?
    GROUP BY provider, date_day
    ORDER BY date_day ASC
  `, [tenantId]);

  const trendMap = {};
  history.forEach(row => {
    const day = row.date_day;
    if (!trendMap[day]) {
      const dateParts = day.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const month = monthNames[parseInt(dateParts[1]) - 1] || 'Jan';
      trendMap[day] = { date: `${month} ${dateParts[2]}` };
    }
    const provName = row.provider === 'azure' ? 'Azure' : row.provider === 'aws' ? 'AWS' : 'GCP';
    trendMap[day][provName] = Math.round(row.avg_score);
  });

  return Object.values(trendMap).slice(-30);
}

/**
 * Historical averages comparison
 */
async function getHistory(tenantId) {
  const db = await getDatabase();
  const comparisonData = await getComparison(tenantId);
  const providers = ['azure', 'aws', 'gcp'];
  const historyStats = {};

  for (const prov of providers) {
    const currentScore = comparisonData.comparison[prov].overallScore;
    const sevenDayRow = await db.get(`
      SELECT AVG(metric_score) as avg_score
      FROM cloud_performance_history
      WHERE tenant_id = ? AND provider = ? AND timestamp >= datetime('now', '-7 days')
    `, [tenantId, prov]);
    const sevenDayAvg = sevenDayRow?.avg_score ? Math.round(sevenDayRow.avg_score) : null;

    const thirtyDayRow = await db.get(`
      SELECT AVG(metric_score) as avg_score
      FROM cloud_performance_history
      WHERE tenant_id = ? AND provider = ?
    `, [tenantId, prov]);
    const thirtyDayAvg = thirtyDayRow?.avg_score ? Math.round(thirtyDayRow.avg_score) : null;

    const diff7 = sevenDayAvg !== null ? currentScore - sevenDayAvg : null;
    const diff30 = thirtyDayAvg !== null ? currentScore - thirtyDayAvg : null;

    historyStats[prov] = {
      provider: prov,
      name: comparisonData.comparison[prov].name,
      current: currentScore,
      avg7Days: sevenDayAvg,
      avg30Days: thirtyDayAvg,
      diff7Days: diff7 !== null ? (diff7 >= 0 ? `+${diff7}%` : `${diff7}%`) : 'N/A',
      diff30Days: diff30 !== null ? (diff30 >= 0 ? `+${diff30}%` : `${diff30}%`) : 'N/A',
      status: diff7 !== null ? (diff7 >= 0 ? 'Improving' : 'Degrading') : 'No history'
    };
  }

  return Object.values(historyStats);
}

module.exports = { getComparison, getTrends, getHistory };
