// ============================================================
// Multi-Cloud Workload Simulator
// Generate workloads, measure telemetry, optimize and compare
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu, Database, Layers, HardDrive, Play, Sparkles, RefreshCw,
  FileText, Download, TrendingDown, ShieldCheck, Activity, Check,
  Terminal, BarChart3, AlertTriangle, Info, ArrowRight, DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, BarChart, Bar
} from 'recharts';
import { fmtCurrency } from '../../utils/formatters';

interface SimulatorLog {
  timestamp: string;
  type: 'info' | 'warn' | 'success' | 'opt';
  message: string;
}

export default function WorkloadSimulator() {
  // Workload Configuration States
  const [vmsCount, setVmsCount] = useState<number>(100);
  const [dbsCount, setDbsCount] = useState<number>(50);
  const [k8sCount, setK8sCount] = useState<number>(20);
  const [storageCount, setStorageCount] = useState<number>(200);
  const [apiRequests, setApiRequests] = useState<number>(1000); // per minute

  // Simulation Running States
  const [simState, setSimState] = useState<'idle' | 'running' | 'completed' | 'optimizing' | 'optimized'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [logs, setLogs] = useState<SimulatorLog[]>([]);
  const [activeTab, setActiveTab] = useState<'cost' | 'telemetry' | 'availability'>('cost');

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (message: string, type: 'info' | 'warn' | 'success' | 'opt' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp: time, type, message }]);
  };

  // Cost and baseline calculations
  const calculateCosts = () => {
    // Before Optimization Prices (monthly avg)
    const vmUnitCostBefore = 120; // $120/month per VM
    const dbUnitCostBefore = 280; // $280/month per DB
    const k8sUnitCostBefore = 550; // $550/month per Cluster
    const storageUnitCostBefore = 15; // $15/month per Storage Account
    const apiUnitCostBefore = 0.05; // $0.05 per 100 requests/min * hours * days

    const vmCostBefore = vmsCount * vmUnitCostBefore;
    const dbCostBefore = dbsCount * dbUnitCostBefore;
    const k8sCostBefore = k8sCount * k8sUnitCostBefore;
    const storageCostBefore = storageCount * storageUnitCostBefore;
    const apiCostBefore = (apiRequests / 100) * apiUnitCostBefore * 30 * 24; // Normalized requests cost

    const totalBefore = vmCostBefore + dbCostBefore + k8sCostBefore + storageCostBefore + apiCostBefore;

    // After Optimization Prices (monthly avg)
    const vmUnitCostAfter = 72; // Rightsizing, scheduling, spot instances (~40% off)
    const dbUnitCostAfter = 160; // Auto-scaling DBs, consolidation (~43% off)
    const k8sUnitCostAfter = 310; // Karpenter, spot nodes, mixed sizes (~44% off)
    const storageUnitCostAfter = 7; // Lifecycle rules, tiering to cool/archive (~53% off)
    const apiUnitCostAfter = 0.02; // API caching, rate limit shielding (~60% off)

    const vmCostAfter = vmsCount * vmUnitCostAfter;
    const dbCostAfter = dbsCount * dbUnitCostAfter;
    const k8sCostAfter = k8sCount * k8sUnitCostAfter;
    const storageCostAfter = storageCount * storageUnitCostAfter;
    const apiCostAfter = (apiRequests / 100) * apiUnitCostAfter * 30 * 24;

    const totalAfter = vmCostAfter + dbCostAfter + k8sCostAfter + storageCostAfter + apiCostAfter;
    const savings = totalBefore - totalAfter;
    const savingsPercent = totalBefore > 0 ? (savings / totalBefore) * 100 : 0;

    return {
      before: {
        vms: vmCostBefore,
        dbs: dbCostBefore,
        k8s: k8sCostBefore,
        storage: storageCostBefore,
        api: apiCostBefore,
        total: totalBefore
      },
      after: {
        vms: vmCostAfter,
        dbs: dbCostAfter,
        k8s: k8sCostAfter,
        storage: storageCostAfter,
        api: apiCostAfter,
        total: totalAfter
      },
      savings,
      savingsPercent
    };
  };

  const costs = calculateCosts();

  // Generate 24-hour simulation data for charts
  const generateTelemetryData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    
    return hours.map((hour, idx) => {
      // Create a daily curve with spikes during business hours (09:00 - 18:00)
      const isPeak = idx >= 9 && idx <= 18;
      const baseLoad = isPeak ? 80 : 45;
      const fluctuation = Math.sin((idx / 24) * Math.PI * 2) * 15 + (Math.random() * 8 - 4);
      
      // Before Optimization metrics
      const cpuBefore = Math.min(98, Math.max(25, baseLoad + fluctuation + 12));
      const memBefore = Math.min(96, Math.max(35, baseLoad + (fluctuation * 0.7) + 15));
      const networkBefore = parseFloat(((apiRequests / 1000) * (baseLoad / 50) + Math.random() * 0.3).toFixed(2));
      
      // SLA availability: dip under high load/spikes
      let availBefore = 99.95;
      if (cpuBefore > 88) availBefore = 99.4 - (Math.random() * 0.5);
      else if (cpuBefore > 75) availBefore = 99.8 - (Math.random() * 0.15);

      // After Optimization metrics (smoothed curves, lower utilization due to rightsizing, higher baseline availability)
      const cpuAfter = Math.min(85, Math.max(20, (baseLoad * 0.8) + (fluctuation * 0.5)));
      const memAfter = Math.min(80, Math.max(30, (baseLoad * 0.75) + (fluctuation * 0.4)));
      const networkAfter = parseFloat((networkBefore * 0.7).toFixed(2)); // Caching reduces network throughput requirements
      const availAfter = 99.99 + (Math.random() * 0.009);

      // Cost progression (hourly snapshot)
      const costBeforeHour = costs.before.total / 720; // 30 days * 24 hours
      const costAfterHour = costs.after.total / 720;

      return {
        hour,
        cpuBefore: parseFloat(cpuBefore.toFixed(1)),
        cpuAfter: parseFloat(cpuAfter.toFixed(1)),
        memBefore: parseFloat(memBefore.toFixed(1)),
        memAfter: parseFloat(memAfter.toFixed(1)),
        networkBefore,
        networkAfter,
        availBefore: parseFloat(availBefore.toFixed(3)),
        availAfter: parseFloat(availAfter.toFixed(3)),
        costBefore: parseFloat(costBeforeHour.toFixed(2)),
        costAfter: parseFloat(costAfterHour.toFixed(2))
      };
    });
  };

  const telemetryData = generateTelemetryData();

  // Run the Workload Simulator
  const runSimulation = () => {
    setSimState('running');
    setProgress(0);
    setLogs([]);
    addLog('Initiating workload simulator engine...', 'info');

    const steps = [
      { p: 15, msg: 'Generating virtual resource instances...', action: () => {
        addLog(`Successfully provisioned ${vmsCount} Virtual Machines. Setting up agent telemetry hooks...`, 'info');
      }},
      { p: 35, msg: 'Initializing cloud databases and database connection pools...', action: () => {
        addLog(`Registered ${dbsCount} Relational Databases in unified cluster. Allocating standard memory buffer pools.`, 'info');
      }},
      { p: 55, msg: 'Setting up Kubernetes clusters...', action: () => {
        addLog(`Configured ${k8sCount} Kubernetes Clusters. Bootstrapping control planes and node groups.`, 'info');
        addLog(`Warning: VM cluster groups lack automatic scale-up policies. Check telemetry warnings.`, 'warn');
      }},
      { p: 75, msg: 'Configuring storage bucket and filesystem mappings...', action: () => {
        addLog(`Connected ${storageCount} Storage Accounts (Blob/S3) across 3 regions. Direct replication disabled (Standard Tier).`, 'info');
      }},
      { p: 90, msg: 'Starting traffic generator...', action: () => {
        addLog(`API Traffic generator initialized. Simulating baseline of ${apiRequests} requests/minute.`, 'info');
        addLog(`High database connection pool wait-time detected on DB-028. CPU utilization spike at 91.5%.`, 'warn');
        addLog(`Availability SLA dropped to 99.78% due to localized connection queue failures.`, 'warn');
      }},
      { p: 100, msg: 'Simulation cycle complete.', action: () => {
        addLog('Baseline workload simulation completed successfully. 24-Hour telemetry profiles compiled.', 'success');
        setSimState('completed');
      }}
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setProgress(step.p);
        setProgressMsg(step.msg);
        step.action();
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 900);
  };

  // Apply Optimization Logic
  const applyOptimization = () => {
    setSimState('optimizing');
    setProgress(0);
    addLog('Executing Multi-Cloud AI Optimization Engine...', 'opt');

    const steps = [
      { p: 20, msg: 'Analyzing CPU utilization trends and rightsizing VMs...', action: () => {
        addLog('[Rightsizer] Scanned virtual machines. Identified 54 under-utilized VMs (< 15% CPU).', 'opt');
        addLog('[Rightsizer] Re-sizing standard D8s_v5 to D4s_v5. Idle VMs scheduled for weekend shutdown.', 'success');
      }},
      { p: 40, msg: 'Consolidating database instances and enabling serverless scaling...', action: () => {
        addLog('[FinOps] Enabling DB serverless scale-down policy on 35 non-production database clusters.', 'opt');
        addLog('[FinOps] Consolidated 12 low-traffic databases into a single shared elastic database pool.', 'success');
      }},
      { p: 60, msg: 'Configuring Kubernetes node auto-scaling and spot instances...', action: () => {
        addLog('[K8s-Opt] Integrated Karpenter cluster autoscaler. Provisioned mixed node groups.', 'opt');
        addLog('[K8s-Opt] Moved dev/test workloads to Spot node pools. Saved ~65% on compute node costs.', 'success');
      }},
      { p: 80, msg: 'Enabling storage lifecycle rules and compression policies...', action: () => {
        addLog('[Storage-Opt] Applying lifecycle policies on storage accounts. Archiving logs > 30 days to Cold/Archive tier.', 'opt');
        addLog('[Storage-Opt] Enabled block compression on telemetry filesystem. Saved 42% storage space.', 'success');
      }},
      { p: 95, msg: 'Optimizing API requests routing and edge cache...', action: () => {
        addLog('[API-Opt] Implemented CDN edge caching for static endpoints. Configured request rate limits.', 'opt');
        addLog('[API-Opt] CDN hit ratio reached 84%. API request load on VM engines reduced by 60%.', 'success');
      }},
      { p: 100, msg: 'All CloudOps optimizations applied successfully.', action: () => {
        addLog('Optimization complete! Telemetry recalculation finalized. Saved ' + costs.savingsPercent.toFixed(1) + '% on monthly running costs.', 'success');
        setSimState('optimized');
      }}
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setProgress(step.p);
        setProgressMsg(step.msg);
        step.action();
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 900);
  };

  const resetSimulator = () => {
    setSimState('idle');
    setProgress(0);
    setProgressMsg('');
    setLogs([]);
  };

  // Report Export Functions
  const triggerPDFExport = () => {
    window.print();
  };

  const triggerCSVExport = () => {
    const headers = 'Hour,CPU Before (%),CPU After (%),Memory Before (%),Memory After (%),Network Before (Gbps),Network After (Gbps),Availability Before (%),Availability After (%),Cost Before ($),Cost After ($)\n';
    const rows = telemetryData.map(d =>
      `${d.hour},${d.cpuBefore},${d.cpuAfter},${d.memBefore},${d.memAfter},${d.networkBefore},${d.networkAfter},${d.availBefore},${d.availAfter},${d.costBefore},${d.costAfter}`
    ).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `cloudops_workload_simulation_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="printable-compliance-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Realistic Workload Simulator</h1>
          <p className="page-subtitle">Generate custom cloud resource architectures, run traffic loads, and benchmark before vs. after optimization results</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 12 }}>
          {simState === 'optimized' && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={triggerPDFExport}>
                <FileText size={14} /> PDF Report
              </button>
              <button className="btn btn-secondary btn-sm" onClick={triggerCSVExport}>
                <Download size={14} /> Export CSV
              </button>
            </>
          )}
          {(simState === 'completed' || simState === 'optimized') && (
            <button className="btn btn-secondary btn-sm" onClick={resetSimulator}>
              <RefreshCw size={14} /> Reset Simulator
            </button>
          )}
        </div>
      </div>

      {/* Simulator Config & Terminal Console */}
      <div className="dashboard-grid no-print">
        {/* Left Side: Workload Configurator */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={16} color="var(--azure-600)" />
              Workload Resource Generator
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Configure the scale of the cloud environment to simulate.
            </p>

            {/* Slider 1: VMs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Cpu size={14} color="var(--text-secondary)" /> Virtual Machines
                </span>
                <span style={{ color: 'var(--azure-600)' }}>{vmsCount} VMs</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                value={vmsCount}
                onChange={(e) => setVmsCount(parseInt(e.target.value))}
                disabled={simState !== 'idle'}
                style={{ width: '100%', accentColor: 'var(--azure-600)' }}
              />
            </div>

            {/* Slider 2: DBs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={14} color="var(--text-secondary)" /> Cloud Databases
                </span>
                <span style={{ color: 'var(--azure-600)' }}>{dbsCount} DBs</span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                value={dbsCount}
                onChange={(e) => setDbsCount(parseInt(e.target.value))}
                disabled={simState !== 'idle'}
                style={{ width: '100%', accentColor: 'var(--azure-600)' }}
              />
            </div>

            {/* Slider 3: Kubernetes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} color="var(--text-secondary)" /> Kubernetes Clusters
                </span>
                <span style={{ color: 'var(--azure-600)' }}>{k8sCount} Clusters</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                value={k8sCount}
                onChange={(e) => setK8sCount(parseInt(e.target.value))}
                disabled={simState !== 'idle'}
                style={{ width: '100%', accentColor: 'var(--azure-600)' }}
              />
            </div>

            {/* Slider 4: Storage */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HardDrive size={14} color="var(--text-secondary)" /> Storage Accounts
                </span>
                <span style={{ color: 'var(--azure-600)' }}>{storageCount} Accounts</span>
              </div>
              <input
                type="range"
                min="20"
                max="1000"
                value={storageCount}
                onChange={(e) => setStorageCount(parseInt(e.target.value))}
                disabled={simState !== 'idle'}
                style={{ width: '100%', accentColor: 'var(--azure-600)' }}
              />
            </div>

            {/* Slider 5: API Requests */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={14} color="var(--text-secondary)" /> API Traffic Speed
                </span>
                <span style={{ color: 'var(--azure-600)' }}>{apiRequests} req/min</span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={apiRequests}
                onChange={(e) => setApiRequests(parseInt(e.target.value))}
                disabled={simState !== 'idle'}
                style={{ width: '100%', accentColor: 'var(--azure-600)' }}
              />
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
              {simState === 'idle' && (
                <button className="btn btn-primary" onClick={runSimulation} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--azure-600)', color: '#fff', padding: '10px', borderRadius: 4, fontWeight: 'bold' }}>
                  <Play size={16} /> Run Workload Simulation
                </button>
              )}

              {simState === 'completed' && (
                <button className="btn btn-primary" onClick={applyOptimization} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--success-600)', color: '#fff', padding: '10px', borderRadius: 4, fontWeight: 'bold' }}>
                  <Sparkles size={16} /> Apply Cloud Optimization
                </button>
              )}

              {(simState === 'running' || simState === 'optimizing') && (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>
                    <span>{progressMsg}</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ width: '100%', background: 'var(--bg-surface-secondary)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, background: simState === 'optimizing' ? 'var(--success-500)' : 'var(--azure-600)', height: '100%', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}

              {simState === 'optimized' && (
                <div className="severity-badge p4" style={{ background: 'rgba(16,124,16,0.15)', color: '#107C10', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, padding: 10 }}>
                  <ShieldCheck size={18} /> Optimization Complete
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Simulator Terminal Console */}
        <div className="card" style={{ background: '#0b132b', color: '#a5b4fc', border: '1px solid #1e293b' }}>
          <div className="card-header" style={{ borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Terminal size={16} color="#38bdf8" />
              Live Simulation Log Terminal
            </div>
            <span style={{ fontSize: 10, background: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: 10, fontFamily: 'var(--font-mono)' }}>
              {simState.toUpperCase()}
            </span>
          </div>
          <div className="card-body" style={{ height: 320, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6, padding: '16px' }}>
            {logs.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 12 }}>
                <Terminal size={32} />
                <span>Configure resources and click "Run Workload Simulation" to start stream.</span>
              </div>
            ) : (
              logs.map((log, index) => {
                let color = '#94a3b8';
                let prefix = '[INFO]';
                if (log.type === 'warn') { color = '#fbbf24'; prefix = '[WARN]'; }
                if (log.type === 'success') { color = '#34d399'; prefix = '[OK]'; }
                if (log.type === 'opt') { color = '#38bdf8'; prefix = '[AI-OPT]'; }

                return (
                  <div key={index} style={{ color, display: 'flex', gap: 8, lineHeight: '1.4' }}>
                    <span style={{ color: '#64748b', flexShrink: 0 }}>[{log.timestamp}]</span>
                    <span style={{ fontWeight: 'bold', flexShrink: 0 }}>{prefix}</span>
                    <span style={{ wordBreak: 'break-word' }}>{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>

      {/* KPI Comparison Dashboard */}
      {(simState === 'completed' || simState === 'optimized') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Savings Metric Panel */}
          {simState === 'optimized' && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(0, 120, 212, 0.08), rgba(0, 183, 195, 0.05))', border: '1px solid rgba(0, 120, 212, 0.2)' }}>
              <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: 24, gap: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--azure-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={22} color="var(--azure-600)" />
                    Optimization Analysis Complete
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    By implementing spot instance configurations, scaling down idle resources, and deploying multi-region redundancy.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>BEFORE MONTHLY RUNNING</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger-600)', textDecoration: 'line-through' }}>
                      {fmtCurrency(costs.before.total)}
                    </div>
                  </div>
                  <ArrowRight size={20} color="var(--text-tertiary)" />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>OPTIMIZED MONTHLY RUNNING</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success-600)' }}>
                      {fmtCurrency(costs.after.total)}
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-strong)', height: 48, margin: '0 8px' }} />
                  <div style={{ textAlign: 'center', background: 'var(--success-50)', border: '1px solid rgba(16,124,16,0.2)', padding: '12px 24px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#107C10', fontWeight: 800, letterSpacing: '0.05em' }}>TOTAL COST SAVED</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#107C10', lineHeight: 1.1 }}>
                      {costs.savingsPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: '#107C10', fontWeight: 600, marginTop: 2 }}>
                      Save {fmtCurrency(costs.savings)} /mo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side KPI Cards */}
          <div className="kpi-grid">
            {/* KPI Card 1: Cost */}
            <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="kpi-title" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Monthly Estimated Cost</span>
                <DollarSign size={16} color="var(--azure-600)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{fmtCurrency(costs.before.total)}</span>
                {simState === 'optimized' && (
                  <span style={{ fontSize: 12, color: 'var(--success-600)', fontWeight: 700 }}>
                    → {fmtCurrency(costs.after.total)}
                  </span>
                )}
              </div>
              <span className="kpi-trend positive" style={{ fontSize: 11 }}>
                {simState === 'optimized' ? (
                  <span style={{ color: '#107C10', fontWeight: 700 }}>Saved {fmtCurrency(costs.savings)} / month</span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>Based on current counts</span>
                )}
              </span>
            </div>

            {/* KPI Card 2: CPU */}
            <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="kpi-title" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Average CPU Utilization</span>
                <Cpu size={16} color="var(--azure-600)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>73.4%</span>
                {simState === 'optimized' && (
                  <span style={{ fontSize: 12, color: 'var(--success-600)', fontWeight: 700 }}>
                    → 51.2%
                  </span>
                )}
              </div>
              <span className="kpi-trend positive" style={{ fontSize: 11 }}>
                {simState === 'optimized' ? (
                  <span style={{ color: '#107C10', fontWeight: 700 }}>Decreased idle overhead by 30.2%</span>
                ) : (
                  <span style={{ color: 'var(--danger-600)', fontWeight: 700 }}>Excessive over-provisioning</span>
                )}
              </span>
            </div>

            {/* KPI Card 3: Memory */}
            <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="kpi-title" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Average Memory Pressure</span>
                <Activity size={16} color="var(--azure-600)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>79.1%</span>
                {simState === 'optimized' && (
                  <span style={{ fontSize: 12, color: 'var(--success-600)', fontWeight: 700 }}>
                    → 58.4%
                  </span>
                )}
              </div>
              <span className="kpi-trend positive" style={{ fontSize: 11 }}>
                {simState === 'optimized' ? (
                  <span style={{ color: '#107C10', fontWeight: 700 }}>Optimal memory page allocations</span>
                ) : (
                  <span style={{ color: 'var(--warning-600)', fontWeight: 700 }}>Potential database page swapping</span>
                )}
              </span>
            </div>

            {/* KPI Card 4: SLA Availability */}
            <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="kpi-title" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>SLA Availability</span>
                <ShieldCheck size={16} color="var(--azure-600)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>99.82%</span>
                {simState === 'optimized' && (
                  <span style={{ fontSize: 12, color: 'var(--success-600)', fontWeight: 700 }}>
                    → 99.99%
                  </span>
                )}
              </div>
              <span className="kpi-trend positive" style={{ fontSize: 11 }}>
                {simState === 'optimized' ? (
                  <span style={{ color: '#107C10', fontWeight: 700 }}>Zero downtime multi-region setups</span>
                ) : (
                  <span style={{ color: 'var(--danger-600)', fontWeight: 700 }}>Outages under traffic peaks</span>
                )}
              </span>
            </div>
          </div>

          {/* Telemetry Charts Section */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} color="var(--azure-600)" />
                Comparative Telemetry Performance Visualizations
              </div>
              {/* Tab Selector */}
              <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 4, overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveTab('cost')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 'bold',
                    background: activeTab === 'cost' ? 'var(--azure-600)' : 'transparent',
                    color: activeTab === 'cost' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cost Analysis
                </button>
                <button
                  onClick={() => setActiveTab('telemetry')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 'bold',
                    background: activeTab === 'telemetry' ? 'var(--azure-600)' : 'transparent',
                    color: activeTab === 'telemetry' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Resource Telemetry
                </button>
                <button
                  onClick={() => setActiveTab('availability')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 'bold',
                    background: activeTab === 'availability' ? 'var(--azure-600)' : 'transparent',
                    color: activeTab === 'availability' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  SLA Availability
                </button>
              </div>
            </div>
            <div className="card-body">
              {activeTab === 'cost' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 300 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Monthly Resource Cost Breakdown (Before vs. After Optimization)</h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={[
                            { name: 'VMs (Compute)', Before: costs.before.vms, After: costs.after.vms },
                            { name: 'Databases', Before: costs.before.dbs, After: costs.after.dbs },
                            { name: 'K8s Clusters', Before: costs.before.k8s, After: costs.after.k8s },
                            { name: 'Storage Acc.', Before: costs.before.storage, After: costs.after.storage },
                            { name: 'API Requests', Before: costs.before.api, After: costs.after.api },
                          ]}
                          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                          <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                          <Tooltip formatter={(value) => [`$${value}`, 'Cost']} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Before" fill="var(--danger-500)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="After" fill="var(--success-500)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, background: 'var(--bg-surface-secondary)' }}>
                        <h4 style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>Cost Savings Matrix</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>VM Optimization (Right-sizing/Spot)</span>
                            <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>-40.0%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>DB Optimization (Serverless scaling)</span>
                            <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>-42.8%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>K8s Karpenter Spot Node-scaling</span>
                            <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>-43.6%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Storage Lifecycle cool tiering</span>
                            <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>-53.3%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>API Gateway & CDN edge caching</span>
                            <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>-60.0%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'telemetry' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>CPU Sizing Performance & Load Balancing (%)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={telemetryData}>
                        <defs>
                          <linearGradient id="colorCpuBefore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--danger-500)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--danger-500)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCpuAfter" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--success-500)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--success-500)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" name="CPU Before (Unoptimized)" dataKey="cpuBefore" stroke="var(--danger-500)" fillOpacity={1} fill="url(#colorCpuBefore)" strokeWidth={1.5} />
                        <Area type="monotone" name="CPU After (Optimized)" dataKey="cpuAfter" stroke="var(--success-500)" fillOpacity={1} fill="url(#colorCpuAfter)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Memory Allocation Profile (%)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={telemetryData}>
                        <defs>
                          <linearGradient id="colorMemBefore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--danger-500)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--danger-500)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMemAfter" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--success-500)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--success-500)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} />
                        <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" name="Memory Before (Unoptimized)" dataKey="memBefore" stroke="var(--danger-500)" fillOpacity={1} fill="url(#colorCpuBefore)" strokeWidth={1.5} />
                        <Area type="monotone" name="Memory After (Optimized)" dataKey="memAfter" stroke="var(--success-500)" fillOpacity={1} fill="url(#colorCpuAfter)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeTab === 'availability' && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>SLA Availability Rate (%)</h4>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={telemetryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                      <YAxis domain={[99.0, 100.0]} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" name="Availability Before (Dips)" dataKey="availBefore" stroke="var(--danger-500)" strokeWidth={2} dot={true} />
                      <Line type="monotone" name="Availability After (Optimized)" dataKey="availAfter" stroke="var(--success-500)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Printable Report Summary (Visible in PDF print outputs, clean card design) */}
          <div className="card print-only" style={{ border: '2px solid #000', padding: 24, pageBreakBefore: 'always' }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: 16, marginBottom: 16 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900 }}>CloudOps Optimizations Audit Report</h2>
              <p style={{ fontSize: 11, color: '#333', marginTop: 4 }}>
                Generated on: {new Date().toLocaleString()} | Cloud Provider Scope: Multi-Cloud Unified
              </p>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Simulated Cloud Topology Configurations</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', textAlign: 'left', fontWeight: 'bold' }}>
                    <th style={{ padding: '6px 0' }}>Resource Asset Class</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Asset Count</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Before Monthly Cost</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>After Monthly Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px dashed #ccc' }}>
                    <td style={{ padding: '6px 0' }}>Virtual Machines (Compute VM)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{vmsCount}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.before.vms)}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.after.vms)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dashed #ccc' }}>
                    <td style={{ padding: '6px 0' }}>Cloud Databases (SQL / NoSQL)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{dbsCount}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.before.dbs)}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.after.dbs)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dashed #ccc' }}>
                    <td style={{ padding: '6px 0' }}>Kubernetes Clusters (Control plane nodes)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{k8sCount}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.before.k8s)}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.after.k8s)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px dashed #ccc' }}>
                    <td style={{ padding: '6px 0' }}>Storage Accounts (Block / Objects)</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{storageCount}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.before.storage)}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.after.storage)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '6px 0' }}>High-Speed API Gateway Service Requests</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{apiRequests} req/min</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.before.api)}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{fmtCurrency(costs.after.api)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Executive Savings Assessment</h3>
              <div style={{ background: '#f1f5f9', padding: 16, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>CUMULATIVE BASELINE MONTHLY COST</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>{fmtCurrency(costs.before.total)}</div>
                </div>
                <ArrowRight size={18} color="#475569" />
                <div>
                  <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>OPTIMIZED RE-BUDGETED MONTHLY COST</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>{fmtCurrency(costs.after.total)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 800 }}>PERCENTAGE TOTAL SAVINGS</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a' }}>{costs.savingsPercent.toFixed(1)}%</div>
                </div>
              </div>
              
              <div style={{ marginTop: 16, fontSize: 11, lineHeight: 1.5, color: '#334155' }}>
                <p><strong>Optimization Directives Evaluated:</strong></p>
                <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                  <li>VM rightsizing downgrades and scheduled off-hours power down.</li>
                  <li>Database scale-to-zero serverless rules and elastic DB pool consolidation.</li>
                  <li>Kubernetes Karpenter integration with AWS/Azure Spot node mix.</li>
                  <li>Storage lifecycle log compression and automated cool tiering archiving.</li>
                  <li>CDN static request edge caching, mitigating 60% of API database backend calls.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
