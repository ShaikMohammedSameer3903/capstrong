// ============================================================
// Optimization Scorecard & ISO 27017 Compliance Center
// Calculates weighted scores, audits compliance, and remediation
// ============================================================

import { useEffect, useState } from 'react';
import {
  Shield, Award, DollarSign, Activity, AlertTriangle, RefreshCw, CheckCircle2,
  Info, ShieldCheck, Heart, Database, Layout, Sparkles, FileText, Download, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { fmtNumber } from '../../utils/formatters';

const PROVIDER_COLORS: Record<string, string> = {
  azure: '#0078d4',
  aws: '#FF9900',
  gcp: '#4285F4',
};

type SubTab = 'scorecard' | 'iso27017' | 'exports';

export default function ComplianceCenter() {
  const [activeTab, setActiveTab] = useState<SubTab>('scorecard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Compliance States
  const [scores, setScores] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);

  const fetchComplianceData = async () => {
    setRefreshing(true);
    try {
      const [scoresRes, compRes] = await Promise.all([
        api.get('/api/compliance/scores'),
        api.get('/api/compliance/iso27017')
      ]);

      setScores(scoresRes);
      setCompliance(compRes);
    } catch (err) {
      console.error('[Compliance Center] Error fetching data:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const handleRemediate = async (policyId: string) => {
    try {
      const res = await api.post<any>(`/api/compliance/policies/${policyId}/remediate`);
      
      // Update compliance state locally
      setCompliance((prev: any) => {
        const updatedPolicies = prev.policies.map((p: any) => {
          if (p.id === policyId) return { ...p, status: 'Compliant' };
          return p;
        });
        const compliantCount = updatedPolicies.filter((p: any) => p.status === 'Compliant').length;
        const totalCount = updatedPolicies.length;
        const percentage = Math.round((compliantCount / totalCount) * 100);

        return {
          ...prev,
          percentage,
          compliantCount,
          failedCount: totalCount - compliantCount,
          policies: updatedPolicies
        };
      });

      // Update scores state locally
      if (res.updatedScores) {
        setScores(res.updatedScores);
      }
    } catch (err) {
      console.error('[Compliance] Failed to remediate policy:', err);
    }
  };

  const triggerPDFExport = () => {
    // Uses the professional window.print() function
    window.print();
  };

  const triggerExcelExport = () => {
    if (!compliance) return;

    // Constructs CSV data matching ISO 27017 checklist
    const headers = 'Policy ID,Provider,Policy Name,Control Category,Compliance Status,Severity,Remediation Steps\n';
    const rows = compliance.policies.map((p: any) => 
      `"${p.id}","${p.provider}","${p.policy_name}","${p.category}","${p.status}","${p.severity}","${p.remediation_steps.replace(/"/g, '""')}"`
    ).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `cloudops_iso27017_compliance_report_${Date.now()}.csv`);
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

  // Generate score improvement opportunities
  const failedPolicies = compliance ? compliance.policies.filter((p: any) => p.status === 'Non-Compliant') : [];
  
  const scorecardCategories = [
    { label: 'Security posture', score: scores?.security_score ?? 80, icon: Shield, color: '#107C10' },
    { label: 'Cost savings', score: scores?.cost_score ?? 80, icon: DollarSign, color: '#0078d4' },
    { label: 'ISO 27017 Compliance', score: scores?.compliance_score ?? 80, icon: ShieldCheck, color: '#8b5cf6' },
    { label: 'Availability SLAs', score: scores?.availability_score ?? 80, icon: Heart, color: '#D13438' },
    { label: 'Capacity performance', score: scores?.performance_score ?? 80, icon: Activity, color: '#00B7C3' },
    { label: 'Storage Backup rules', score: scores?.backup_score ?? 80, icon: Database, color: '#FFB900' },
    { label: 'Cloud governance', score: scores?.governance_score ?? 80, icon: Layout, color: '#64748B' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="printable-compliance-view">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-content">
          <h1 className="page-title">Optimization Scorecard & ISO 27017 Compliance</h1>
          <p className="page-subtitle">Weighted multi-cloud health indexes, automated audit frameworks, and security remediation controls</p>
        </div>
        <button className="btn btn-secondary btn-sm no-print" onClick={fetchComplianceData} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Auditing…' : 'Re-Audit Clouds'}
        </button>
      </div>

      {/* Sub-tab Navigation */}
      <div className="no-print" style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4, gap: 16 }}>
        <button
          onClick={() => setActiveTab('scorecard')}
          style={{
            padding: '10px 16px 8px',
            border: 'none',
            borderBottom: activeTab === 'scorecard' ? '2px solid var(--azure-600)' : '2px solid transparent',
            color: activeTab === 'scorecard' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Award size={16} /> Optimization Scorecard
        </button>
        <button
          onClick={() => setActiveTab('iso27017')}
          style={{
            padding: '10px 16px 8px',
            border: 'none',
            borderBottom: activeTab === 'iso27017' ? '2px solid var(--azure-600)' : '2px solid transparent',
            color: activeTab === 'iso27017' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldCheck size={16} /> ISO 27017 Compliance Center
        </button>
        <button
          onClick={() => setActiveTab('exports')}
          style={{
            padding: '10px 16px 8px',
            border: 'none',
            borderBottom: activeTab === 'exports' ? '2px solid var(--azure-600)' : '2px solid transparent',
            color: activeTab === 'exports' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Download size={16} /> Exports & Reports
        </button>
      </div>

      {/* Tab content 1: Optimization Scorecard */}
      {activeTab === 'scorecard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Health ring & Sub-scores split */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
            {/* Overall Score Wheel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>Overall Cloud Health Score</div>
              {/* Circular Gauge Ring */}
              <div style={{ position: 'relative', width: 140, height: 140, margin: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--border-subtle)" strokeWidth="3" />
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--azure-500)" strokeWidth="3" strokeDasharray={`${scores?.overall_score ?? 80} ${100 - (scores?.overall_score ?? 80)}`} strokeDashoffset="25" style={{ transition: 'stroke-dasharray 0.3s ease' }} />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)' }}>{scores?.overall_score ?? 80}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--success-600)', background: 'rgba(16,124,16,0.1)', padding: '2px 6px', borderRadius: 4, marginTop: 4 }}>
                    {(scores?.overall_score ?? 80) >= 80 ? 'Optimal' : 'Needs Review'}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Weighted calculation spanning Security posture, compliance checklist ratios, Cost efficiency, and backup availability SLA factors.
              </div>
            </div>

            {/* Sub-Score Cards grid */}
            <div className="card">
              <div className="card-header"><div className="card-title">Scorecard Sub-Dimensions (0-100)</div></div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {scorecardCategories.map(cat => (
                  <div key={cat.label} style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-surface-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{cat.label}</span>
                      <cat.icon size={14} color={cat.color} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{cat.score}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>/100</span>
                    </div>
                    {/* Tiny progress bar */}
                    <div style={{ width: '100%', height: 3, background: 'var(--border-subtle)', borderRadius: 1.5, overflow: 'hidden' }}>
                      <div style={{ width: `${cat.score}%`, height: '100%', background: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations to improve scores */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="var(--azure-600)" /> Scorecard Optimization Recommendations
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {failedPolicies.length > 0 ? (
                failedPolicies.slice(0, 3).map((policy: any) => {
                  const improvement = policy.severity === 'Critical' ? 8 : policy.severity === 'High' ? 5 : 3;
                  return (
                    <div key={policy.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'center', padding: 16, border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface-secondary)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: PROVIDER_COLORS[policy.provider.toLowerCase()] + '18', color: PROVIDER_COLORS[policy.provider.toLowerCase()] }}>
                            {policy.provider.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{policy.policy_name}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                          Remediation action: {policy.remediation_steps}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-600)' }}>
                          +{improvement} Score Points
                        </span>
                        <button
                          onClick={() => handleRemediate(policy.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          Remediate
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  All security and operational audits compliant. No recommendations available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab content 2: ISO 27017 Compliance */}
      {activeTab === 'iso27017' && compliance && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Compliance Stats header card */}
          <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', padding: 24 }}>
            <div style={{ width: 100, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100%" height="100%" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--border-subtle)" strokeWidth="4" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--success-500)" strokeWidth="4" strokeDasharray={`${compliance.percentage} ${100 - compliance.percentage}`} strokeDashoffset="25" />
              </svg>
              <div style={{ position: 'absolute', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {compliance.percentage}%
              </div>
            </div>
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>ISO/IEC 27017 Security Compliance Control Audits</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 500, lineHeight: 1.4 }}>
                A checklist audit verifying controls mapping encryption, role assignments, multi-factor logins, storage configurations, and network isolation policies.
              </p>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12 }}>
                <div>Compliant Policies: <strong style={{ color: 'var(--success-600)' }}>{compliance.compliantCount}</strong></div>
                <div>Failed Audits: <strong style={{ color: 'var(--danger-500)' }}>{compliance.failedCount}</strong></div>
              </div>
            </div>
          </div>

          {/* Detailed Audits Table */}
          <div className="card">
            <div className="card-header"><div className="card-title">ISO 27017 Policy Control Audits List</div></div>
            <div className="card-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-default)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Cloud</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Control Policy Name</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Severity</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Remediation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.policies.map((p: any) => {
                    const provColor = p.provider === 'AZURE' ? PROVIDER_COLORS.azure : p.provider === 'AWS' ? PROVIDER_COLORS.aws : PROVIDER_COLORS.gcp;
                    
                    const sevClass = p.severity === 'Critical' ? 'p1' : p.severity === 'High' ? 'p2' : 'p3';
                    const statusClass = p.status === 'Compliant' ? 'p4' : 'p1';

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 800, color: provColor }}>
                          {p.provider}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 600, maxWidth: 300 }}>
                          <div>{p.policy_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.remediation_steps}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)' }}>
                            {p.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`severity-badge ${sevClass}`}>{p.severity}</span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`severity-badge ${statusClass}`} style={p.status === 'Compliant' ? { background: 'rgba(16,124,16,0.15)', color: '#107C10' } : undefined}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          {p.status === 'Non-Compliant' ? (
                            <button
                              onClick={() => handleRemediate(p.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 10px', fontSize: 11 }}
                            >
                              Remediate
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#107C10', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              <Check size={12} strokeWidth={3} /> Resolved
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab content 3: Exports & Reports Center */}
      {activeTab === 'exports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">ISO 27017 Security Auditing Export Hub</div></div>
            <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {/* PDF report block */}
              <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 20, flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-surface-secondary)' }}>
                <FileText size={32} color="var(--azure-500)" />
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>ISO 27017 Compliance Audit Report (PDF)</div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Generates a print-ready executive PDF report detailing sub-scores, compliance checklist status, and remediation details.
                </p>
                <button
                  onClick={triggerPDFExport}
                  className="btn"
                  style={{ background: 'var(--azure-500)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', fontSize: 13 }}
                >
                  <FileText size={14} /> Export PDF Report
                </button>
              </div>

              {/* Excel report block */}
              <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, padding: 20, flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-surface-secondary)' }}>
                <Download size={32} color="var(--success-500)" />
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>ISO 27017 Audit Policies checklist (CSV/Excel)</div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Generates a CSV mapping control category, policy name, compliance status, severity index, and step-by-step remediation procedures.
                </p>
                <button
                  onClick={triggerExcelExport}
                  className="btn"
                  style={{ background: 'var(--success-600)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', fontSize: 13 }}
                >
                  <Download size={14} /> Export CSV/Excel Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
