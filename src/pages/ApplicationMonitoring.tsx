import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle2, RefreshCw, Terminal, Layers } from 'lucide-react';
import AnimatedPage from '../components/layout/AnimatedPage';

interface AppHealth {
  id: string;
  application_id: string;
  application_name: string;
  provider: string;
  cpu_percent: number;
  memory_percent: number;
  network_kbps: number;
  disk_usage_percent: number;
  request_count: number;
  error_count: number;
  availability_percent: number;
  response_time_ms: number;
  container_status: string;
  restart_count: number;
  pod_status: string;
  node_status: string;
}

export default function ApplicationMonitoring() {
  const [data, setData] = useState<AppHealth[]>([]);
  const [summary, setSummary] = useState<{
    totalApplications: number;
    healthyCount: number;
    avgCpu: number;
    avgMemory: number;
    avgLatency: number;
    totalRequests: number;
    totalErrors: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/app-monitoring/metrics', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data || []);
        setSummary(result.summary || null);
      }
    } catch (err) {
      console.error('Error fetching application telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <AnimatedPage>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <Activity className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Application & Infrastructure Monitoring</h1>
              <p className="text-slate-500 text-sm">
                Real-time telemetry for CPU, Memory, Disk, Requests, Latency, Pod & Node status across clouds.
              </p>
            </div>
          </div>
          <button
            onClick={fetchMetrics}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Telemetry Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase">Avg CPU Usage</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary ? `${summary.avgCpu}%` : '—'}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{summary ? 'Live telemetry' : 'No telemetry endpoint configured'}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase">Avg Memory Load</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary ? `${summary.avgMemory}%` : '—'}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{summary ? 'Live memory metric' : 'No telemetry endpoint configured'}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase">Avg Response Time</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary ? `${summary.avgLatency} ms` : '—'}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{summary ? 'Live response latency' : 'No telemetry endpoint configured'}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Requests (24h)</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{summary ? summary.totalRequests.toLocaleString() : '0'}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{summary ? `${summary.totalErrors} error responses` : '0 errors'}</span>
          </div>
        </div>

        {/* Deployed Apps Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full p-12 text-center text-slate-500">Loading Application Telemetry...</div>
          ) : data.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="inline-flex p-3 bg-slate-100 rounded-full text-slate-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Application Telemetry Available</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                No active application telemetry or monitoring endpoints configured. Deploy an application to track real-time CPU, Memory, Latency, and Container health.
              </p>
            </div>
          ) : (
            data.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{item.application_name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      item.provider.toLowerCase() === 'azure' ? 'bg-blue-100 text-blue-700' :
                      item.provider.toLowerCase() === 'aws' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {item.provider}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                  </span>
                </div>

                {/* Gauges & Telemetry Stats */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-blue-600" /> CPU Load</span>
                      <span className="font-mono font-bold text-slate-800">{item.cpu_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${item.cpu_percent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-purple-600" /> Memory Load</span>
                      <span className="font-mono font-bold text-slate-800">{item.memory_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: `${item.memory_percent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block">Container Status</span>
                      <span className="font-semibold text-emerald-700">{item.container_status}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block">Restarts</span>
                      <span className="font-semibold text-slate-800">{item.restart_count}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block">Pod Status</span>
                      <span className="font-semibold text-emerald-700">{item.pod_status || 'Ready'}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-500 block">Node Status</span>
                      <span className="font-semibold text-emerald-700">{item.node_status || 'Ready'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
