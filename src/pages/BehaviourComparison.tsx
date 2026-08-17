import React, { useState, useEffect } from 'react';
import { Scale, Trophy, Zap, DollarSign, Clock, BarChart3, CheckCircle2, Sparkles, Award } from 'lucide-react';
import AnimatedPage from '../components/layout/AnimatedPage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface MetricItem {
  category: string;
  azure: number;
  aws: number;
  gcp: number;
  winner: string;
  unit: string;
}

export default function BehaviourComparison() {
  const [data, setData] = useState<{
    metrics: MetricItem[];
    winners: {
      overallWinner: string;
      bestProvider: string;
      bestCost: string;
      fastestDeployment: string;
    };
    radarData: Array<{ metric: string; Azure: number; AWS: number; GCP: number }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/behaviour/comparison', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AnimatedPage>
      <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        {/* Glassmorphic Gradient Header */}
        <div className="gradient-header-purple rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
          <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg glow-subtle-purple float-gentle">
                <Scale className="w-8 h-8 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500/20 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-400/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Multi-Cloud Benchmark Suite
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Behaviour & Performance Comparison</h1>
                <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                  Side-by-side empirical performance evaluation measuring CPU overhead, memory consumption, HTTP latency, spend, and startup responsiveness.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 text-right backdrop-blur-md">
                <div className="text-[11px] font-semibold text-amber-400 uppercase flex items-center justify-end gap-1">
                  <Trophy className="w-3.5 h-3.5" /> Benchmark Leader
                </div>
                <div className="text-2xl font-black text-white">{data?.winners?.overallWinner || 'Pending Evaluation'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Winner Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:to-slate-900 p-6 rounded-3xl border border-amber-300/60 dark:border-amber-700/50 shadow-md card-hover-effect relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Overall Winner</span>
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-md">
                <Trophy className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-3">{data?.winners?.overallWinner || 'Pending'}</p>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1">Multi-Cloud Evaluation</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm card-hover-effect">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Best Cost Advantage</span>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-3">{data?.winners?.bestCost || 'No Cost Data'}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Empirical Spend Analysis</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm card-hover-effect">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Fastest Pipeline</span>
              <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-3">{data?.winners?.fastestDeployment || 'No Pipeline Data'}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Measured Deployment Timing</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm card-hover-effect">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Top Rated Provider</span>
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-3">{data?.winners?.bestProvider || 'No Evaluation'}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Calculated Parity Index</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-7 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Side-by-Side Performance (Azure vs AWS vs GCP)
              </h3>
            </div>
            <div className="h-80 w-full pt-2">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs">Loading benchmark charts...</p>
                </div>
              ) : (
                <ResponsiveContainer minWidth={0} minHeight={280} width="100%" height={280}>
                  <BarChart data={data?.metrics || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, color: '#ffffff' }} />
                    <Legend />
                    <Bar dataKey="azure" name="Azure" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="aws" name="AWS" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="gcp" name="GCP" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Radar Chart Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-7 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Multi-Dimensional Cloud Parity Radar
              </h3>
            </div>
            <div className="h-80 w-full pt-2">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs">Generating radar matrix...</p>
                </div>
              ) : (
                <ResponsiveContainer minWidth={0} minHeight={280} width="100%" height={280}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data?.radarData || []}>
                    <PolarGrid stroke="#475569" opacity={0.4} />
                    <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" />
                    <Radar name="Azure" dataKey="Azure" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                    <Radar name="AWS" dataKey="AWS" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                    <Radar name="GCP" dataKey="GCP" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, color: '#ffffff' }} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
