// ============================================================
// AI Optimization Center — Modern Multi-Cloud Optimization Module
// ============================================================

import { useEffect, useState, useRef } from 'react';
import {
  DollarSign, Zap, TrendingDown, Cpu, Layers, Activity, HardDrive,
  CheckCircle2, XCircle, AlertCircle, Play, X, ChevronRight, Info,
  Sparkles, ShieldCheck, RefreshCw, BarChart3, HelpCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { api } from '../../services/api';
import { fmtCurrency, fmtPercent } from '../../utils/formatters';

interface SummaryData {
  optimizationScore: number;
  estimatedMonthlySavings: number;
  appliedMonthlySavings: number;
  averageConfidence: number;
  activeRecommendationsCount: number;
  appliedRecommendationsCount: number;
  providerSavings: Record<string, number>;
  providerActiveCount: Record<string, number>;
}

interface Recommendation {
  id: string;
  provider: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  category: string;
  current_sku: string;
  recommended_sku: string;
  estimated_savings: number;
  confidence_score: number;
  reason: string;
  root_cause: string;
  status: 'Active' | 'Applied' | 'Dismissed';
}

interface ForecastPoint {
  date: string;
  Current: number;
  Optimized: number;
}

interface ForecastData {
  cost: ForecastPoint[];
  cpu: ForecastPoint[];
  memory: ForecastPoint[];
  storage: ForecastPoint[];
  network: ForecastPoint[];
}

interface OpLog {
  id: number;
  operation_id: string;
  message: string;
  timestamp: string;
}

export default function AiOptimizationCenter() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [forecasts, setForecasts] = useState<ForecastData | null>(null);
  
  const [activeTab, setActiveTab] = useState<'cost' | 'cpu' | 'memory' | 'storage' | 'network'>('cost');
  const [activeProvider, setActiveProvider] = useState<'all' | 'azure' | 'aws' | 'gcp'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Application Simulation States
  const [applyingRec, setApplyingRec] = useState<Recommendation | null>(null);
  const [opId, setOpId] = useState<string | null>(null);
  const [opStage, setOpStage] = useState<string>('Validation');
  const [opPercent, setOpPercent] = useState<number>(0);
  const [opStatus, setOpStatus] = useState<'Running' | 'Succeeded' | 'Failed' | null>(null);
  const [opLogs, setOpLogs] = useState<OpLog[]>([]);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<any>(null);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [summaryRes, recsRes, forecastsRes] = await Promise.all([
        api.get<SummaryData>('/api/optimization/summary'),
        api.get<Recommendation[]>('/api/optimization/recommendations'),
        api.get<ForecastData>('/api/optimization/forecasts')
      ]);

      setSummary(summaryRes);
      setRecommendations(recsRes);
      setForecasts(forecastsRes);
    } catch (err) {
      console.error('[OPTIMIZATION] Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Scroll to bottom of logs when a new log arrives
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [opLogs]);

  // Apply Recommendation simulation triggering
  const handleApply = async (rec: Recommendation) => {
    setApplyingRec(rec);
    setOpId(null);
    setOpStage('Initiating simulation...');
    setOpPercent(0);
    setOpStatus('Running');
    setOpLogs([]);

    try {
      const response = await api.post<{ success: boolean; operationId: string; message: string }>(
        '/api/optimization/apply',
        { id: rec.id }
      );
      
      if (response.success && response.operationId) {
        setOpId(response.operationId);
        startPollingOperation(response.operationId);
      } else {
        throw new Error(response.message || 'Failed to start execution simulation.');
      }
    } catch (err: any) {
      setOpStatus('Failed');
      setOpStage('Failed to start');
      setOpLogs(prev => [
        ...prev,
        {
          id: Date.now(),
          operation_id: 'err',
          message: `Fatal error: ${err.message || 'Server connection failed'}`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };

  // Start polling operation progress
  const startPollingOperation = (operationId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        // 1. Fetch operation logs
        const logs = await api.get<OpLog[]>(`/api/actions/operations/${operationId}/logs`);
        setOpLogs(logs);

        // 2. Fetch overall status from the operations list
        const operations = await api.get<any[]>('/api/actions/operations');
        const currentOp = operations.find((o: any) => o.id === operationId);

        if (currentOp) {
          setOpStage(currentOp.stage || 'Processing');
          setOpPercent(currentOp.percent ?? 0);
          
          if (currentOp.status === 'Succeeded') {
            setOpStatus('Succeeded');
            setOpPercent(100);
            clearInterval(pollIntervalRef.current);
            // Refresh data to update metrics
            fetchData();
          } else if (currentOp.status === 'Failed') {
            setOpStatus('Failed');
            clearInterval(pollIntervalRef.current);
            fetchData();
          }
        }
      } catch (err: any) {
        console.warn('[POLLING ERROR]', err);
      }
    }, 1000);
  };

  // Dismiss recommendation
  const handleDismiss = async (id: string) => {
    if (!confirm('Are you sure you want to dismiss this recommendation?')) return;
    try {
      await api.post('/api/optimization/dismiss', { id });
      fetchData();
    } catch (err) {
      console.error('Failed to dismiss recommendation:', err);
    }
  };

  const closeSimulationModal = () => {
    setApplyingRec(null);
    setOpId(null);
    setOpStatus(null);
    setOpLogs([]);
  };

  // Filters and values
  const filteredRecommendations = recommendations.filter(rec => {
    const providerMatch = activeProvider === 'all' || rec.provider.toLowerCase() === activeProvider;
    return providerMatch;
  });

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'azure': return '#0078d4';
      case 'aws': return '#FF9900';
      case 'gcp': return '#4285F4';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
        <div style={{
          width: 40, height: 40,
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr', gap: 2, borderRadius: 4, overflow: 'hidden',
          animation: 'pulse 1.5s infinite ease-in-out'
        }}>
          <span style={{ background: '#0078d4', borderRadius: 1 }} />
          <span style={{ background: '#00B7C3', borderRadius: 1 }} />
          <span style={{ background: '#107C10', borderRadius: 1 }} />
          <span style={{ background: '#FFB900', borderRadius: 1 }} />
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
          Analyzing infrastructure optimization opportunities...
        </div>
      </div>
    );
  }

  // Get Score colors
  const score = summary?.optimizationScore || 100;
  const scoreColor = score >= 85 ? 'var(--success-600)' : score >= 70 ? 'var(--warning-600)' : 'var(--danger-600)';

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Sparkles size={20} color="var(--azure-600)" />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--azure-600)' }}>
              AI Optimization Center
            </span>
          </div>
          <h1 className="page-title">Continuous Cloud Optimization</h1>
          <p className="page-subtitle">
            AI-driven rightsizing recommendations, resource forecasts, and self-healing automation simulations.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh AI Center'}
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid-3 mb-6">
        {/* Score Card */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                Optimization Score <span title="Reflects overall multi-cloud sizing efficiency. Max score is 100%."><Info size={13} className="text-muted" /></span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor, marginTop: 4 }}>
                {score}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                {score >= 85 ? 'Excellent Sizing Health' : score >= 70 ? 'Needs Rightsizing Review' : 'Critical Sizing Overhead'}
              </div>
            </div>
            {/* Simple Circular SVG Gauge */}
            <svg width="70" height="70" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border-subtle)"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={scoreColor}
                strokeWidth="3.5"
                strokeDasharray={`${score}, 100`}
              />
            </svg>
          </div>
        </div>

        {/* Savings Card */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Estimated Monthly Savings
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--success-600)', marginTop: 4 }}>
                {fmtCurrency(summary?.estimatedMonthlySavings)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Applied Savings: {fmtCurrency(summary?.appliedMonthlySavings || 0)}/mo
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(16, 124, 16, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              <TrendingDown size={22} color="var(--success-600)" />
            </div>
          </div>
        </div>

        {/* Confidence Card */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Recommendation Quality
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--azure-600)', marginTop: 4 }}>
                {summary?.averageConfidence}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Avg Confidence Score based on telemetry
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0, 120, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} color="var(--azure-600)" />
            </div>
          </div>
        </div>
      </div>

      {/* Forecasting Charts Tabs Block */}
      <div className="card mb-6">
        <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="var(--azure-600)" />
            <div className="card-title">AI Forecast Projection (30 Days)</div>
          </div>
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface-secondary)', padding: 3, borderRadius: 6 }}>
            {[
              { id: 'cost', label: 'Cost', icon: DollarSign },
              { id: 'cpu', label: 'CPU Usage', icon: Cpu },
              { id: 'memory', label: 'Memory', icon: Layers },
              { id: 'storage', label: 'Storage', icon: HardDrive },
              { id: 'network', label: 'Network', icon: Activity }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                  boxShadow: activeTab === tab.id ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="card-body" style={{ padding: 24 }}>
          {forecasts && forecasts[activeTab] && forecasts[activeTab].length > 0 ? (
            <div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecasts[activeTab]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--danger-500)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--danger-500)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success-500)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--success-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                      axisLine={false}
                      tickLine={false}
                      unit={activeTab === 'cost' ? ' $' : activeTab === 'storage' ? ' GB' : activeTab === 'network' ? ' MB' : '%'}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 6,
                        boxShadow: 'var(--shadow-md)',
                        fontSize: 12
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                    <Area
                      name={activeTab === 'cost' ? 'Current Daily Cost' : `Current ${activeTab.toUpperCase()}`}
                      type="monotone"
                      dataKey="Current"
                      stroke="var(--danger-500)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#currentGrad)"
                    />
                    <Area
                      name={activeTab === 'cost' ? 'Optimized Daily Cost' : `Optimized ${activeTab.toUpperCase()}`}
                      type="monotone"
                      dataKey="Optimized"
                      stroke="var(--success-500)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#optimizedGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-surface-secondary)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={14} color="var(--azure-600)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {activeTab === 'cost' && `AI Cost projection indicates applying all optimization rules drops total daily run-rate. Cumulative savings projection over 30 days is ${fmtCurrency(summary?.estimatedMonthlySavings)}.`}
                  {activeTab === 'cpu' && 'Current compute VM nodes sit mostly idle at ~4% CPU load. Right-sizing pushes node density upward to 25-30% CPU, improving sizing efficiencies without throttling traffic peaks.'}
                  {activeTab === 'memory' && 'Memory footprints will be compacted into downsized nodes, moving typical memory utilization ranges from 14% up to a resource-efficient 52%.'}
                  {activeTab === 'storage' && 'Deallocating unused scratch logs and disk backups recovers roughly 700 GB of high-speed block storage space across subscriptions.'}
                  {activeTab === 'network' && 'Network ingress/egress parameters remain unchanged since right-sizing targets CPU, Memory, and storage tier configurations, preserving data transfer performance.'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No forecast data available.</div>
          )}
        </div>
      </div>

      {/* Main Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          AI Recommendation Cards ({filteredRecommendations.length})
        </h2>
        {/* Provider Filters */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'azure', 'aws', 'gcp'].map(prov => (
            <button
              key={prov}
              onClick={() => setActiveProvider(prov as any)}
              className={`btn ${activeProvider === prov ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{
                textTransform: 'capitalize',
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: activeProvider === prov ? 700 : 500
              }}
            >
              {prov}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid-2">
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map(rec => (
            <div key={rec.id} className="card" style={{ display: 'flex', flexDirection: 'column', opacity: rec.status !== 'Active' ? 0.75 : 1, transition: 'all 0.2s ease' }}>
              <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: getProviderColor(rec.provider)
                    }}
                  />
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                    {rec.resource_name}
                  </div>
                </div>
                {/* Status / Category badge */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 700,
                      background: rec.category === 'Cost' ? 'rgba(16,124,16,0.1)' : 'rgba(139,92,246,0.1)',
                      color: rec.category === 'Cost' ? 'var(--success-700)' : 'var(--purple-500)',
                      padding: '2px 8px', borderRadius: 4
                    }}
                  >
                    {rec.category}
                  </span>
                  {rec.status !== 'Active' && (
                    <span
                      style={{
                        fontSize: 10, fontWeight: 700,
                        background: rec.status === 'Applied' ? 'rgba(16,124,16,0.15)' : 'rgba(107,114,128,0.1)',
                        color: rec.status === 'Applied' ? 'var(--success-700)' : 'var(--text-secondary)',
                        padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase'
                      }}
                    >
                      {rec.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="card-body" style={{ padding: 20, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Resource Info */}
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                  ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{rec.resource_id}</span>
                  <br />
                  Type: <span style={{ fontFamily: 'var(--font-mono)' }}>{rec.resource_type}</span>
                </div>

                {/* Rightsizing Arrow */}
                <div style={{ background: 'var(--bg-surface-secondary)', padding: '12px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ width: '45%' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Current Configuration</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2, wordBreak: 'break-word' }}>
                      {rec.current_sku}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                  <div style={{ width: '45%' }}>
                    <div style={{ fontSize: 10, color: 'var(--azure-700)', textTransform: 'uppercase', fontWeight: 600 }}>Recommended Config</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--azure-800)', marginTop: 2, wordBreak: 'break-word' }}>
                      {rec.recommended_sku}
                    </div>
                  </div>
                </div>

                {/* Savings and Confidence strip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 10, background: 'rgba(16,124,16,0.04)', border: '1px solid rgba(16,124,16,0.1)', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Monthly Savings</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success-600)', marginTop: 2 }}>
                      {fmtCurrency(rec.estimated_savings)}
                    </div>
                  </div>
                  <div style={{ padding: 10, background: 'rgba(0,120,212,0.04)', border: '1px solid rgba(0,120,212,0.1)', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Confidence Score</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--azure-600)', marginTop: 2 }}>
                      {rec.confidence_score}%
                    </div>
                  </div>
                </div>

                {/* Root Cause Analysis section */}
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Info size={13} color="var(--azure-600)" />
                    Root Cause Analysis
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {rec.root_cause}
                  </p>
                </div>

                {/* Actions */}
                {rec.status === 'Active' ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => handleApply(rec)}
                      className="btn btn-primary"
                      style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, padding: '8px 16px' }}
                    >
                      <Zap size={14} /> Apply Recommendation
                    </button>
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: 13, padding: '8px 16px', color: 'var(--danger-500)' }}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: 8, background: 'rgba(16,124,16,0.06)', borderRadius: 6, justifyContent: 'center' }}>
                    <CheckCircle2 size={15} color="var(--success-600)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success-700)' }}>
                      Recommendation applied successfully via simulation.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="card col-span-2" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No recommendations match the filter criteria.
          </div>
        )}
      </div>

      {/* Apply Simulation Modal */}
      {applyingRec && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-overlay)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="var(--azure-600)" className="animate-pulse" />
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                  Applying AI Sizing Optimization
                </div>
              </div>
              {opStatus !== 'Running' && (
                <button onClick={closeSimulationModal} style={{ color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="card-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Target info */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Target Resource</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  {applyingRec.resource_name} ({applyingRec.provider.toUpperCase()})
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Resizing config from <span style={{ textDecoration: 'line-through' }}>{applyingRec.current_sku.split(' ')[0]}</span> to <span style={{ fontWeight: 600, color: 'var(--azure-600)' }}>{applyingRec.recommended_sku.split(' ')[0]}</span>
                </div>
              </div>

              {/* Progress visual */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Stage: <span style={{ color: 'var(--text-primary)' }}>{opStage}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--azure-600)' }}>
                    {opPercent}%
                  </span>
                </div>
                {/* Progress bar container */}
                <div style={{ height: 8, background: 'var(--bg-surface-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: opStatus === 'Failed' ? 'var(--danger-500)' : 'linear-gradient(90deg, var(--azure-500), var(--teal-500))',
                      width: `${opPercent}%`,
                      borderRadius: 4,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Terminal Logs console */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Execution Activity Logs
                </div>
                <div style={{
                  height: 160, background: '#0F172A', borderRadius: 6,
                  padding: 12, overflowY: 'auto', fontFamily: 'var(--font-mono)',
                  fontSize: 11, color: '#38BDF8', display: 'flex', flexDirection: 'column', gap: 6,
                  border: '1px solid #334155'
                }}>
                  {opLogs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: '#64748B' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span style={{ color: log.message.includes('failed') || log.message.includes('error') ? '#F87171' : '#F1F5F9' }}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  {opStatus === 'Running' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399' }}>
                      <span className="animate-pulse">●</span>
                      <span>Execution in progress... waiting for next log emission</span>
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>

              {/* Success / Failure visual state */}
              {opStatus === 'Succeeded' && (
                <div style={{ background: 'rgba(16, 124, 16, 0.05)', border: '1px solid rgba(16, 124, 16, 0.15)', padding: 12, borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={18} color="var(--success-600)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success-700)' }}>Resource Optimization Applied Successfully</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      The optimization rules have updated this resource configuration. The database states and resource costs have updated to reflect the downsized tier.
                    </div>
                  </div>
                </div>
              )}

              {opStatus === 'Failed' && (
                <div style={{ background: 'rgba(209, 52, 56, 0.05)', border: '1px solid rgba(209, 52, 56, 0.15)', padding: 12, borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <XCircle size={18} color="var(--danger-500)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger-700)' }}>Simulation execution failed</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Please review the logs console. An issue occurred while resizing telemetry nodes. Try restarting the local dev server.
                    </div>
                  </div>
                </div>
              )}

              {/* Complete buttons */}
              {opStatus !== 'Running' && (
                <button
                  onClick={closeSimulationModal}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 700 }}
                >
                  Close Operation Viewer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
