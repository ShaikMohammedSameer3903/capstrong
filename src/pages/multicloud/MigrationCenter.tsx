// ============================================================
// Cloud Migration Recommendation & Simulation Center
// Evaluates and automates cross-cloud transitions (Azure <-> AWS <-> GCP)
// ============================================================

import { useEffect, useState } from 'react';
import {
  TrendingUp, Cpu, HardDrive, Shield, DollarSign, Activity, AlertTriangle,
  RefreshCw, CheckCircle2, Info, ChevronRight, Play, Terminal, X, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { fmtCurrency } from '../../utils/formatters';

const PROVIDER_COLORS: Record<string, string> = {
  azure: '#0078d4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

export default function MigrationCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Simulation states
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simPercent, setSimPercent] = useState(0);
  const [simStatus, setSimStatus] = useState<string>('Running');

  const fetchRecommendations = async () => {
    setRefreshing(true);
    try {
      const data = await api.get<any[]>('/api/migration/recommendations');
      setRecommendations(data);
    } catch (err) {
      console.error('[Migration Center] Error fetching recommendations:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Poll simulation progress
  useEffect(() => {
    if (!isSimulating || !operationId) return;

    const intervalId = setInterval(async () => {
      try {
        const op = await api.get<any>(`/api/actions/operations/${operationId}`);
        const logsRes = await api.get<any[]>(`/api/actions/operations/${operationId}/logs`);

        setSimPercent(op.percent || 0);
        setSimStatus(op.status || 'Running');
        setSimLogs(logsRes.map(l => l.message));

        if (op.status === 'Succeeded' || op.status === 'Failed') {
          clearInterval(intervalId);
          // Refresh list to update status
          fetchRecommendations();
        }
      } catch (err) {
        console.error('[Migration Center] Error polling simulation status:', err);
        clearInterval(intervalId);
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [isSimulating, operationId]);

  const handleStartMigration = async (rec: any) => {
    setSelectedRec(rec);
    setIsSimulating(true);
    setSimPercent(5);
    setSimStatus('Running');
    setSimLogs(['Initializing cross-cloud migration transfer pipeline...']);
    
    try {
      const res = await api.post<any>('/api/migration/migrate', { recommendationId: rec.id });
      setOperationId(res.operationId);
    } catch (err) {
      console.error('[Migration Center] Failed to initiate migration:', err);
      setSimStatus('Failed');
      setSimLogs(prev => [...prev, `CRITICAL ERROR: Failed to contact backend simulation engine.`]);
    }
  };

  const closeConsole = () => {
    setIsSimulating(false);
    setSelectedRec(null);
    setOperationId(null);
    setSimLogs([]);
    setSimPercent(0);
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

  // Filter recommendations based on active state
  const activeRecs = recommendations.filter(r => r.status === 'Active');
  const migratedRecs = recommendations.filter(r => r.status === 'Migrated');

  const totalSavings = activeRecs.reduce((sum, r) => sum + r.estimated_savings, 0);
  const avgConfidence = activeRecs.length > 0
    ? Math.round(activeRecs.reduce((sum, r) => sum + r.confidence_score, 0) / activeRecs.length)
    : 0;
  const totalMigrationCost = activeRecs.reduce((sum, r) => sum + r.migration_cost, 0);
  const totalDowntime = activeRecs.reduce((sum, r) => sum + r.downtime, 0);

  const getProviderBadge = (provider: string) => {
    const provLower = provider.toLowerCase();
    const color = PROVIDER_COLORS[provLower] || '#94a3b8';
    return (
      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: `${color}18`, color }}>
        {provider.toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">AI Cloud Migration Center</h1>
          <p className="page-subtitle">Cross-cloud workload placement matchmaking, pricing optimization, and automated migration logs</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRecommendations} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Scanning…' : 'Scan Workloads'}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'var(--success-500)' }} />
          <div className="kpi-card-top">
            <div>
              <div className="kpi-label">Potential Monthly Savings</div>
              <div className="kpi-value" style={{ color: 'var(--success-500)' }}>{fmtCurrency(totalSavings)}</div>
            </div>
            <div className="kpi-icon" style={{ background: 'rgba(16,124,16,0.1)' }}><TrendingUp size={20} color="var(--success-500)" /></div>
          </div>
          <div className="kpi-trend" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Accumulated optimization savings</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: 'var(--azure-500)' }} />
          <div className="kpi-card-top">
            <div>
              <div className="kpi-label">Average Confidence Score</div>
              <div className="kpi-value" style={{ color: 'var(--azure-500)' }}>{avgConfidence}%</div>
            </div>
            <div className="kpi-icon" style={{ background: 'rgba(0,120,212,0.1)' }}><Shield size={20} color="var(--azure-500)" /></div>
          </div>
          <div className="kpi-trend" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Algorithmic matchmaking score</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: '#FFB900' }} />
          <div className="kpi-card-top">
            <div>
              <div className="kpi-label">Estimated Migration Cost</div>
              <div className="kpi-value" style={{ color: '#FFB900' }}>{fmtCurrency(totalMigrationCost)}</div>
            </div>
            <div className="kpi-icon" style={{ background: 'rgba(255,185,0,0.1)' }}><DollarSign size={20} color="#FFB900" /></div>
          </div>
          <div className="kpi-trend" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Based on data egress and target setup</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-accent" style={{ background: '#D13438' }} />
          <div className="kpi-card-top">
            <div>
              <div className="kpi-label">Expected Total Downtime</div>
              <div className="kpi-value" style={{ color: '#D13438' }}>{totalDowntime.toFixed(1)} hrs</div>
            </div>
            <div className="kpi-icon" style={{ background: 'rgba(209,52,56,0.1)' }}><Activity size={20} color="#D13438" /></div>
          </div>
          <div className="kpi-trend" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Safe delta database replication time</div>
        </div>
      </div>

      {/* Migration Recommendations Grid */}
      <div className="card">
        <div className="card-header"><div className="card-title">AI Workload Placement & Migration Proposals</div></div>
        <div className="card-body">
          {activeRecs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeRecs.map(rec => (
                <div key={rec.id} style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 20, background: 'var(--bg-surface-secondary)', display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Mapping Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 280 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{rec.resource_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {getProviderBadge(rec.source_provider)} · {fmtCurrency(rec.source_price)}/mo
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'var(--border-default)' }}>
                      <ArrowRight size={14} color="var(--text-secondary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Target placement specs</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {getProviderBadge(rec.target_provider)} · {fmtCurrency(rec.target_price)}/mo
                      </div>
                    </div>
                  </div>

                  {/* Sizing Stats */}
                  <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
                    <div>
                      <div style={{ color: 'var(--text-tertiary)' }}>Compute Specs</div>
                      <div style={{ fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Cpu size={12} /> {rec.cpu} Cores / {rec.memory} GB RAM
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-tertiary)' }}>Disk Storage</div>
                      <div style={{ fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HardDrive size={12} /> {rec.storage} GB
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Migration parameters */}
                  <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
                    <div>
                      <div style={{ color: 'var(--text-tertiary)' }}>Monthly Savings</div>
                      <div style={{ fontWeight: 700, color: 'var(--success-500)', marginTop: 4 }}>+{fmtCurrency(rec.estimated_savings)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-tertiary)' }}>Performance Delta</div>
                      <div style={{ fontWeight: 700, color: 'var(--azure-500)', marginTop: 4 }}>+{rec.performance_improvement}%</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-tertiary)' }}>Confidence Score</div>
                      <div style={{ fontWeight: 700, color: rec.confidence_score > 90 ? 'var(--success-500)' : '#FFB900', marginTop: 4 }}>{rec.confidence_score}%</div>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleStartMigration(rec)}
                    className="btn"
                    style={{ background: 'var(--azure-500)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13 }}
                  >
                    <Play size={14} fill="white" /> Migrate Workload
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={36} color="var(--success-500)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700 }}>All workloads reside in optimal provider placements.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Check back later for pricing anomalies or capacity warnings.</div>
            </div>
          )}
        </div>
      </div>

      {/* Completed Migrations Section */}
      {migratedRecs.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">Completed Migrations History</div></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {migratedRecs.map(rec => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'rgba(16,124,16,0.03)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{rec.resource_name} (Migrated Successfully)</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Moved from {rec.source_provider} to {rec.target_provider} · Realized Monthly Savings: {fmtCurrency(rec.estimated_savings)}
                    </div>
                  </div>
                  <span className="severity-badge p4" style={{ background: 'rgba(16,124,16,0.15)', color: '#107C10' }}>
                    <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Completed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Simulation Terminal Console Modal */}
      {isSimulating && selectedRec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 640, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 24px 54px rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'hidden' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <Terminal size={18} color="var(--azure-500)" /> Migration Console: {selectedRec.resource_name}
              </div>
              <button onClick={closeConsole} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>Overall Transfer Pipeline Progress</span>
                  <span>{simPercent}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${simPercent}%`, height: '100%', background: simStatus === 'Failed' ? 'var(--danger-600)' : 'var(--azure-500)', transition: 'width 300ms ease' }} />
                </div>
              </div>

              {/* Terminal Logs Canvas */}
              <div style={{ background: '#0c0f12', border: '1px solid #1e2630', borderRadius: 8, padding: 16, height: 260, overflowY: 'auto', fontFamily: 'Consolas, monospace', fontSize: 11, color: '#a5b4fc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {simLogs.map((log, index) => (
                  <div key={index} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#6366f1' }}>$</span>
                    <span>{log}</span>
                  </div>
                ))}
                {simPercent < 100 && simStatus === 'Running' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#6366f1' }}>$</span>
                    <span style={{ display: 'inline-block', width: 6, height: 12, background: '#a5b4fc', animation: 'pulse 1s infinite' }} />
                  </div>
                )}
              </div>

              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                {simStatus === 'Succeeded' && (
                  <button onClick={closeConsole} className="btn" style={{ background: 'var(--success-600)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6 }}>
                    Finished
                  </button>
                )}
                {simStatus === 'Failed' && (
                  <button onClick={closeConsole} className="btn" style={{ background: 'var(--danger-600)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6 }}>
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
