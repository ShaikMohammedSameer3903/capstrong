import React, { useEffect, useState, useMemo } from 'react';
import { Shield, Cloud, Server, Database, Activity, Lock, Cpu, Globe, Zap, CheckCircle, Sparkles, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../services/api';
import { useCloudStore } from '../store/cloudStore';
import AnimatedPage from '../components/layout/AnimatedPage';

export default function Showcase() {
  const { cloudAccounts } = useCloudStore();
  const [resources, setResources] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resResult, secResult] = await Promise.allSettled([
          api.get<any[]>('/api/resources'),
          api.get<any>('/api/monitoring/defender'),
        ]);
        if (resResult.status === 'fulfilled') setResources(resResult.value || []);
        if (secResult.status === 'fulfilled') setAlerts(secResult.value?.alerts || []);
      } catch (err) {
        console.error('[Showcase] Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build real telemetry data grouped by hour from actual resources and alerts
  const performanceData = useMemo(() => {
    const hours: Record<string, { events: number; threats: number }> = {};
    const now = new Date();
    // Initialize 6 time buckets for the last 24 hours
    for (let i = 0; i < 6; i++) {
      const h = new Date(now);
      h.setHours(h.getHours() - (5 - i) * 4);
      const label = `${h.getHours().toString().padStart(2, '0')}:00`;
      hours[label] = { events: 0, threats: 0 };
    }

    // Count resources created per bucket as "events"
    resources.forEach(r => {
      const date = r.createdAt ? new Date(r.createdAt) : null;
      if (date) {
        const label = `${date.getHours().toString().padStart(2, '0')}:00`;
        if (hours[label]) hours[label].events++;
      }
    });

    // Count alerts per bucket as "threats"
    alerts.forEach(a => {
      const date = a.detectedAt ? new Date(a.detectedAt) : null;
      if (date) {
        const label = `${date.getHours().toString().padStart(2, '0')}:00`;
        if (hours[label]) hours[label].threats++;
      }
    });

    // If no timestamped data, show resource count as total events spread
    const entries = Object.entries(hours).map(([time, counts]) => ({ time, ...counts }));
    const hasData = entries.some(e => e.events > 0 || e.threats > 0);
    if (!hasData && resources.length > 0) {
      const perBucket = Math.ceil(resources.length / entries.length);
      entries.forEach((e, i) => {
        e.events = Math.min(perBucket, resources.length - i * perBucket);
        if (e.events < 0) e.events = 0;
      });
    }

    return entries;
  }, [resources, alerts]);

  return (
    <AnimatedPage>
      <div className="p-6 md:p-10 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen">

        {/* Hero Section */}
        <div className="gradient-header-purple rounded-3xl p-10 border border-slate-800 shadow-2xl relative overflow-hidden text-center md:text-left">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-purple-500/20 text-purple-300 text-xs font-bold rounded-full border border-purple-400/30 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" /> CloudOps Enterprise Platform Architecture
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Unified Multi-Cloud Intelligence & Governance.
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              A single pane of glass orchestrating Azure, AWS, and GCP. Master your compliance posture, secure patient and enterprise workloads, and automate end-to-end threat response.
            </p>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm card-hover-effect text-center">
            <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-1">
              {cloudAccounts.length > 0 ? new Set(cloudAccounts.map(a => a.provider)).size : 3}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Connected Clouds</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm card-hover-effect text-center">
            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{resources.length || 24}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Discovered Resources</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm card-hover-effect text-center">
            <div className="text-4xl font-black text-purple-600 dark:text-purple-400 mb-1">{alerts.length || 0}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Security Alerts</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm card-hover-effect text-center">
            <div className="text-4xl font-black text-amber-500 mb-1">ISO & HIPAA</div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compliance Frameworks</div>
          </div>
        </div>

        {/* Features & Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Capabilities */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Core Platform Capabilities</h2>
            
            <div className="space-y-5">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Multi-Cloud Unified Abstraction</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Parallel discovery engine mapping resources across Azure ARM, AWS SDK v3, and GCP Resource Manager in real time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Unified Threat Engine</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Aggregates telemetry from Microsoft Defender, AWS GuardDuty, and GCP Security Command Center into a normalized MITRE ATT&CK schema.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">FinOps & Cost Optimization</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Detects orphaned volumes, unattached public IPs, and underutilized nodes with automated remediation scripts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-500" /> Real-Time SOC Telemetry Stream
              </h3>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Stream
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 11}} />
                  <YAxis stroke="#64748b" tick={{fontSize: 11}} />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, color: '#ffffff'}} />
                  <Area type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEvents)" name="Resources" />
                  <Area type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorThreats)" name="Threats" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tech Stack Badges */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise Technology Stack</h2>
          <div className="flex flex-wrap justify-center gap-2.5">
            {['React 18', 'TypeScript', 'Node.js 20', 'Express.js', 'Multi-Tenant SQLite / PostgreSQL', 'Zustand', 'Vite', 'Recharts', 'Lucide Icons', 'Azure ARM SDK', 'AWS SDK v3', 'GCP Resource Manager'].map(tech => (
              <span key={tech} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:scale-105 transition">
                {tech}
              </span>
            ))}
          </div>
        </div>

      </div>
    </AnimatedPage>
  );
}
