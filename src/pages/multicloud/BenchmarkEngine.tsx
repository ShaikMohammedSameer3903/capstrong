// ============================================================
// Multi-Cloud Benchmark Engine Dashboard
// Interactive comparison charts, rankings, and benchmark reports
// ============================================================

import { useEffect, useState } from 'react';
import {
  RefreshCw, TrendingUp, BarChart3, Award, ShieldCheck, Heart,
  Cpu, HardDrive, Network, DollarSign, Activity, FileText, Download
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line
} from 'recharts';
import { api } from '../../services/api';
import { fmtCurrency } from '../../utils/formatters';

const PROVIDER_COLORS: Record<string, string> = {
  azure: '#0078d4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

export default function BenchmarkEngine() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States
  const [comparison, setComparison] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const fetchBenchmarkData = async () => {
    setRefreshing(true);
    try {
      const [compRes, trendsRes, historyRes] = await Promise.all([
        api.get('/api/performance/comparison'),
        api.get('/api/performance/trends'),
        api.get('/api/performance/history')
      ]);

      setComparison(compRes);
      setTrends(trendsRes as any[]);
      setHistory(historyRes as any[]);
    } catch (err) {
      console.error('[Benchmark Engine] Error fetching stats:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmarkData();
  }, []);

  const triggerPDFExport = () => {
    window.print();
  };

  const triggerCSVExport = () => {
    if (!comparison) return;

    const headers = 'Metric,AWS Score,Azure Score,GCP Score\n';
    const metrics = [
      { name: 'CPU Sizing', key: 'cpu' },
      { name: 'Memory Allocation', key: 'memory' },
      { name: 'Disk Read/Write', key: 'disk' },
      { name: 'IOPS Baseline', key: 'iops' },
      { name: 'Average Latency', key: 'latency' },
      { name: 'Guaranteed SLA Availability', key: 'availability' },
      { name: 'Throughput Speed', key: 'network' },
      { name: 'Service Response Time', key: 'responseTime' },
      { name: 'Storage Compression', key: 'storageUsage' },
      { name: 'Running Cost Avg', key: 'runningCost' }
    ];

    const rows = metrics.map(m => 
      `"${m.name}",${comparison.comparison.aws[m.key].value},${comparison.comparison.azure[m.key].value},${comparison.comparison.gcp[m.key].value}`
    ).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `cloudops_benchmark_performance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="page-header">
          <div className="skeleton skeleton-text lg" style={{ width: 300, height: 26, marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: 500 }} />
        </div>
        <div className="kpi-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="kpi-card"><div className="skeleton" style={{ height: 100, borderRadius: 10 }} /></div>
          ))}
        </div>
      </div>
    );
  }

  // Compile radar metric data
  const radarData = [
    { metric: 'CPU', AWS: comparison.comparison.aws.cpu.value, Azure: comparison.comparison.azure.cpu.value, GCP: comparison.comparison.gcp.cpu.value },
    { metric: 'Memory', AWS: comparison.comparison.aws.memory.value, Azure: comparison.comparison.azure.memory.value, GCP: comparison.comparison.gcp.memory.value },
    { metric: 'Disk', AWS: comparison.comparison.aws.disk.value, Azure: comparison.comparison.azure.disk.value, GCP: comparison.comparison.gcp.disk.value },
    { metric: 'Latency', AWS: comparison.comparison.aws.latency.value, Azure: comparison.comparison.azure.latency.value, GCP: comparison.comparison.gcp.latency.value },
    { metric: 'SLA', AWS: comparison.comparison.aws.availability.value, Azure: comparison.comparison.azure.availability.value, GCP: comparison.comparison.gcp.availability.value },
    { metric: 'Network', AWS: comparison.comparison.aws.network.value, Azure: comparison.comparison.azure.network.value, GCP: comparison.comparison.gcp.network.value }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="printable-compliance-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Cloud Benchmark Engine</h1>
          <p className="page-subtitle">Cross-cloud telemetry benchmarks, latency stats, throughput rankings, and comparative cost indexes</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={triggerPDFExport}>
            <FileText size={14} /> PDF Report
          </button>
          <button className="btn btn-secondary btn-sm" onClick={triggerCSVExport}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchBenchmarkData} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Updating…' : 'Re-Run Benchmark'}
          </button>
        </div>
      </div>

      {/* Rankings Leaderboard & Best Recommendation card */}
      <div className="dashboard-grid">
        {/* Rankings Leaderboard */}
        <div className="card">
          <div className="card-header"><div className="card-title"><Award size={16} color="var(--azure-600)" /> Overall Performance Rankings</div></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comparison.rankings.map((rank: any) => {
              const provColor = rank.provider === 'azure' ? PROVIDER_COLORS.azure : rank.provider === 'aws' ? PROVIDER_COLORS.aws : PROVIDER_COLORS.gcp;
              return (
                <div key={rank.provider} style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-tertiary)', width: 28 }}>#{rank.rank}</div>
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{rank.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Normalized performance indexing</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: provColor }}>{rank.score}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best Provider Recommendation */}
        <div className="card" style={{ borderLeft: `4px solid ${PROVIDER_COLORS[comparison.bestProvider.provider]}` }}>
          <div className="card-header"><div className="card-title"><ShieldCheck size={16} color="var(--success-500)" /> Best Provider Recommendation</div></div>
          <div className="card-body">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: PROVIDER_COLORS[comparison.bestProvider.provider] }}>
              {comparison.bestProvider.summary}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
              {comparison.bestProvider.rationale}
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <span className="severity-badge p4" style={{ background: 'rgba(16,124,16,0.15)', color: '#107C10' }}>
                Overall Rank: #1
              </span>
              <span className="severity-badge p2">
                Normalized Score: {comparison.bestProvider.score}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive comparison charts */}
      <div className="dashboard-grid">
        {/* Radar profile */}
        <div className="card col-span-1">
          <div className="card-header"><div className="card-title"><Activity size={16} color="var(--azure-600)" /> Multi-Dimensional Performance Profile</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="var(--border-subtle)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <PolarRadiusAxis angle={30} domain={[50, 100]} tick={{ fontSize: 9 }} />
                <Radar name="AWS" dataKey="AWS" stroke={PROVIDER_COLORS.aws} fill={PROVIDER_COLORS.aws} fillOpacity={0.15} />
                <Radar name="Azure" dataKey="Azure" stroke={PROVIDER_COLORS.azure} fill={PROVIDER_COLORS.azure} fillOpacity={0.15} />
                <Radar name="GCP" dataKey="GCP" stroke={PROVIDER_COLORS.gcp} fill={PROVIDER_COLORS.gcp} fillOpacity={0.15} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trends */}
        <div className="card col-span-2">
          <div className="card-header"><div className="card-title"><TrendingUp size={16} color="var(--azure-600)" /> 30-Day Benchmark Trends</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" name="AWS" dataKey="AWS" stroke={PROVIDER_COLORS.aws} strokeWidth={2} dot={false} />
                <Line type="monotone" name="Azure" dataKey="Azure" stroke={PROVIDER_COLORS.azure} strokeWidth={2} dot={false} />
                <Line type="monotone" name="GCP" dataKey="GCP" stroke={PROVIDER_COLORS.gcp} strokeWidth={2} dot={false} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparison Detail metrics list */}
      <div className="card">
        <div className="card-header"><div className="card-title"><BarChart3 size={16} color="var(--azure-600)" /> Core Telemetry Performance Breakdown</div></div>
        <div className="card-body">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Benchmark Metric</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, color: PROVIDER_COLORS.aws }}>AWS (Amazon Web Services)</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, color: PROVIDER_COLORS.azure }}>Azure (Microsoft Azure)</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, color: PROVIDER_COLORS.gcp }}>GCP (Google Cloud Platform)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'CPU Capacity Stability', icon: Cpu, key: 'cpu' },
                { label: 'Memory Sizing efficiency', icon: Heart, key: 'memory' },
                { label: 'Disk R/W Read Write speeds', icon: HardDrive, key: 'disk' },
                { label: 'Disk IOPS Baseline', icon: HardDrive, key: 'iops' },
                { label: 'Average Ping Network Latency', icon: Network, key: 'latency' },
                { label: 'SLA Availability SLA', icon: ShieldCheck, key: 'availability' },
                { label: 'Throughput network bandwidth', icon: Network, key: 'network' },
                { label: 'Service HTTP Response Time', icon: Activity, key: 'responseTime' },
                { label: 'Storage allocation footprint', icon: HardDrive, key: 'storageUsage' },
                { label: 'Core Running Cost efficiency', icon: DollarSign, key: 'runningCost' }
              ].map(m => (
                <tr key={m.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 8px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <m.icon size={14} color="var(--text-secondary)" />
                      {m.label}
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {comparison.comparison.aws[m.key].value}/100
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {comparison.comparison.aws[m.key].display}
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {comparison.comparison.azure[m.key].value}/100
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {comparison.comparison.azure[m.key].display}
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {comparison.comparison.gcp[m.key].value}/100
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {comparison.comparison.gcp[m.key].display}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
