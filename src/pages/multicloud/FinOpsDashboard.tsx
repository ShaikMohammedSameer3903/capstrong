// ============================================================
// Enterprise FinOps Command Center Dashboard
// Cost breakdowns, Idle Wastes sweepers, RI/Spot instance optimizations
// ============================================================

import { useEffect, useState } from 'react';
import {
  TrendingUp, DollarSign, Activity, AlertTriangle, RefreshCw,
  CheckCircle2, Info, Landmark, Layers, Sparkles, HardDrive, Trash2, Check
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line
} from 'recharts';
import { api } from '../../services/api';
import { fmtCurrency } from '../../utils/formatters';

const PROVIDER_COLORS: Record<string, string> = {
  azure: '#0078d4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

const CHART_COLORS = ['#0078d4', '#FF9900', '#4285F4', '#107C10', '#8b5cf6', '#D13438'];

export default function FinOpsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // FinOps States
  const [summary, setSummary] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [wastes, setWastes] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchFinOpsData = async () => {
    setRefreshing(true);
    try {
      const [sumRes, breakRes, wastesRes, suggsRes, alertsRes] = await Promise.all([
        api.get('/api/finops/summary'),
        api.get('/api/finops/breakdown'),
        api.get('/api/finops/wastes'),
        api.get('/api/finops/suggestions'),
        api.get('/api/finops/alerts')
      ]);

      setSummary(sumRes);
      setBreakdown(breakRes);
      setWastes(wastesRes as any[]);
      setSuggestions(suggsRes as any[]);
      setAlerts(alertsRes as any[]);
    } catch (err) {
      console.error('[FinOps Dashboard] Error loading stats:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinOpsData();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.post(`/api/finops/alerts/${alertId}/resolve`);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('[FinOps] Failed to resolve budget alert:', err);
    }
  };

  const handleSweepWaste = (wasteName: string) => {
    // Simulated sweep action
    setWastes(prev => prev.filter(w => w.name !== wasteName));
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

  // Cost waste summary
  const totalWaste = wastes.reduce((sum, w) => sum + w.costImpact, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark color="var(--azure-500)" /> Enterprise FinOps Command Center
          </h1>
          <p className="page-subtitle">SaaS budget thresholds, cost wastage allocation, Spot/RI recommendations, and cloud API integrations</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchFinOpsData} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Sync Billing APIs'}
        </button>
      </div>

      {/* KPI Stats Row */}
      {summary && (
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="kpi-card">
            <div className="kpi-card-accent" style={{ background: 'var(--azure-500)' }} />
            <div className="kpi-card-top">
              <div>
                <div className="kpi-label">Monthly Cost Spend</div>
                <div className="kpi-value" style={{ color: 'var(--azure-500)' }}>{fmtCurrency(summary.monthlyCost)}</div>
              </div>
              <div className="kpi-icon" style={{ background: 'rgba(0,120,212,0.1)' }}><DollarSign size={20} color="var(--azure-500)" /></div>
            </div>
            {/* Progress bar to Budget */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                <span>Budget Cap: {fmtCurrency(summary.budgetLimit)}</span>
                <span>{Math.round((summary.monthlyCost / summary.budgetLimit) * 100)}%</span>
              </div>
              <div style={{ width: '100%', height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                <div style={{ width: `${Math.min(100, (summary.monthlyCost / summary.budgetLimit) * 100)}%`, height: '100%', background: summary.monthlyCost > summary.budgetLimit ? 'var(--danger-500)' : 'var(--azure-500)' }} />
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent" style={{ background: 'var(--success-500)' }} />
            <div className="kpi-card-top">
              <div>
                <div className="kpi-label">Daily Average Cost</div>
                <div className="kpi-value" style={{ color: 'var(--success-500)' }}>
                  {fmtCurrency(summary.monthlyCost / 30)}
                </div>
              </div>
              <div className="kpi-icon" style={{ background: 'rgba(16,124,16,0.1)' }}><Activity size={20} color="var(--success-500)" /></div>
            </div>
            <div className="kpi-trend" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Rolling 30-day billing cycle</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent" style={{ background: 'var(--azure-500)' }} />
            <div className="kpi-card-top">
              <div>
                <div className="kpi-label">Monthly Cost Forecast</div>
                <div className="kpi-value" style={{ color: 'var(--azure-500)' }}>{fmtCurrency(summary.forecastedCost)}</div>
              </div>
              <div className="kpi-icon" style={{ background: 'rgba(0,120,212,0.1)' }}><TrendingUp size={20} color="var(--azure-500)" /></div>
            </div>
            <div className="kpi-trend" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Projected billing month-end</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-accent" style={{ background: totalWaste > 200 ? 'var(--danger-600)' : '#FFB900' }} />
            <div className="kpi-card-top">
              <div>
                <div className="kpi-label">Savings Opportunities</div>
                <div className="kpi-value" style={{ color: totalWaste > 200 ? 'var(--danger-600)' : '#FFB900' }}>{fmtCurrency(totalWaste)}</div>
              </div>
              <div className="kpi-icon" style={{ background: 'rgba(209,52,56,0.1)' }}><AlertTriangle size={20} color="var(--danger-600)" /></div>
            </div>
            <div className="kpi-trend" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Aggregated idle/unused wastes</div>
          </div>
        </div>
      )}

      {/* Main interactive charts */}
      {breakdown && (
        <div className="dashboard-grid">
          {/* Daily Cost trends */}
          {summary && (
            <div className="card col-span-2">
              <div className="card-header"><div className="card-title"><Activity size={16} color="var(--azure-600)" /> 30-Day Cost Projections & Trends</div></div>
              <div className="card-body">
                {summary.dailyCostTrend && summary.dailyCostTrend.length > 0 ? (
                  <ResponsiveContainer minWidth={0} width="100%" height={240}>
                    <LineChart data={summary.dailyCostTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" name="Daily cost" dataKey="cost" stroke="var(--azure-500)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No daily cost telemetry available for connected accounts.</div>
                )}
              </div>
            </div>
          )}

          {/* Group Cost by service */}
          <div className="card col-span-1">
            <div className="card-header"><div className="card-title"><Layers size={16} color="var(--azure-600)" /> Service Cost Breakdown</div></div>
            <div className="card-body" style={{ minHeight: 240 }}>
              {breakdown.services && breakdown.services.length > 0 ? (
                <>
                  <ResponsiveContainer minWidth={0} width="100%" height={200}>
                    <PieChart>
                      <Pie data={breakdown.services} cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2} dataKey="value">
                        {breakdown.services.map((entry: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                    {breakdown.services.slice(0, 4).map((s: any, i: number) => (
                      <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{s.name} ({Math.round(s.value)}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No service cost breakdown.</div>
              )}
            </div>
          </div>

          {/* Department-wise Cost allocation */}
          <div className="card col-span-1">
            <div className="card-header"><div className="card-title"><Landmark size={16} color="var(--azure-600)" /> Department Cost Allocation</div></div>
            <div className="card-body">
              {breakdown.departments && breakdown.departments.length > 0 ? (
                <ResponsiveContainer minWidth={0} width="100%" height={240}>
                  <BarChart data={breakdown.departments} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" name="Department cost" fill="var(--azure-500)" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No department cost data.</div>
              )}
            </div>
          </div>

          {/* Resource Contributors */}
          <div className="card col-span-2">
            <div className="card-header"><div className="card-title"><Layers size={16} color="var(--azure-600)" /> Top Resource Billing Contributors</div></div>
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>Resource Name</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>Cloud Provider</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600 }}>Service Category</th>
                    <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>Monthly Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.resources.map((res: any) => {
                    const provColor = res.provider === 'azure' ? PROVIDER_COLORS.azure : res.provider === 'aws' ? PROVIDER_COLORS.aws : PROVIDER_COLORS.gcp;
                    return (
                      <tr key={res.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 4px', fontWeight: 700 }}>{res.name}</td>
                        <td style={{ padding: '12px 4px', fontWeight: 800, color: provColor }}>{res.provider.toUpperCase()}</td>
                        <td style={{ padding: '12px 4px' }}>{res.service}</td>
                        <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 800 }}>{fmtCurrency(res.cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Waste Sweeper & Budget Alerts Row */}
      <div className="dashboard-grid">
        {/* Budget Alerts */}
        <div className="card col-span-1">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle color="var(--danger-500)" size={16} /> FinOps Budget Threshold Alerts
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <div key={alert.id} style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(209,52,56,0.03)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{alert.budget_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Limit: {fmtCurrency(alert.limit_amount)} · Current spend: {fmtCurrency(alert.current_spend)} ({alert.triggered_percentage}%)
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: 11 }}
                  >
                    Acknowledge
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={24} color="var(--success-500)" style={{ margin: '0 auto 8px' }} />
                <span>No active budget violations.</span>
              </div>
            )}
          </div>
        </div>

        {/* Cost Waste sweepers */}
        <div className="card col-span-2">
          <div className="card-header"><div className="card-title"><Trash2 size={16} color="var(--azure-600)" /> Resource Cost Waste Sweeper</div></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {wastes.length > 0 ? (
              <div className="insight-list">
                {wastes.map(w => (
                  <div key={w.name} className="insight-item" style={{ borderLeft: '3px solid var(--danger-500)', paddingLeft: 12 }}>
                    <div className="insight-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(209,52,56,0.1)', color: 'var(--danger-700)' }}>
                          {w.type}
                        </span>
                        <div className="insight-title" style={{ fontWeight: 700 }}>{w.name} ({w.provider})</div>
                      </div>
                      <div className="insight-desc" style={{ marginTop: 4 }}>
                        {w.reason} · Cost Impact: <strong>{fmtCurrency(w.costImpact)}/mo</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSweepWaste(w.name)}
                      className="btn"
                      style={{ background: 'rgba(209,52,56,0.1)', color: 'var(--danger-700)', border: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, fontSize: 12 }}
                    >
                      <Trash2 size={12} /> Sweep
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={28} color="var(--success-500)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700 }}>All idle/unused resources clean.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spot & RI Suggestions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles color="var(--azure-500)" size={16} /> Reserved Instance (RI) & Spot Instance Savings suggestions
          </div>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {suggestions.map(s => (
            <div key={s.id} style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-secondary)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: PROVIDER_COLORS[s.provider.toLowerCase()] + '15', color: PROVIDER_COLORS[s.provider.toLowerCase()] }}>
                    {s.provider.toUpperCase()}
                  </span>
                  <span className="severity-badge p4" style={{ background: 'rgba(16,124,16,0.15)', color: '#107C10' }}>
                    {s.type}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>{s.resource}</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 540 }}>{s.reason}</p>
              </div>
              <div style={{ display: 'flex', gap: 24, fontSize: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Current / Target</div>
                  <div style={{ fontWeight: 700, marginTop: 4 }}>{fmtCurrency(s.currentCost)} → {fmtCurrency(s.targetCost)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Monthly Savings</div>
                  <div style={{ fontWeight: 800, color: 'var(--success-500)', marginTop: 4 }}>+{fmtCurrency(s.savings)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,124,16,0.1)', color: '#107C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {s.confidence}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Confidence</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
