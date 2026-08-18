import React, { useState, useEffect } from 'react';
import { BarChart3, Layers, Cloud, Cpu, Database, Shield, DollarSign, Download, Filter, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import AnimatedPage from '../components/layout/AnimatedPage';

interface DiffItem {
  category: string;
  azure: string;
  aws: string;
  gcp: string;
  pricing: string;
  deploymentBehaviour: string;
  recoveryBehaviour: string;
}

export default function InfrastructureDifferenceReport() {
  const [matrix, setMatrix] = useState<DiffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    const token = localStorage.getItem('cloudops-local-token') || localStorage.getItem('token') || '';
    fetch('/api/infrastructure-difference/matrix', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setMatrix(data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', 'Object Storage', 'Virtual Machines', 'Container Services', 'Networking', 'Identity', 'Databases', 'Security'];

  const filteredMatrix = activeCategory === 'All'
    ? matrix
    : matrix.filter(item => item.category.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <AnimatedPage>
      <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        {/* Glassmorphic Gradient Banner */}
        <div className="gradient-header-blue rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
          <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg glow-subtle-blue float-gentle">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" /> Multi-Cloud Parity Matrix
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Infrastructure Difference Report</h1>
                <p className="text-slate-600 text-sm mt-1 max-w-2xl">
                  Deep architectural service mapping, cost variance analysis, and behavioral differences across Azure, AWS, and GCP.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/80 border border-slate-200 rounded-2xl px-5 py-3 text-right backdrop-blur-md shadow-sm">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Categories Analyzed</div>
                <div className="text-2xl font-black text-blue-600">{matrix.length} Service Domains</div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category Filter:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-105'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Report Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-sm">Evaluating Multi-Cloud Infrastructure Difference Matrix...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredMatrix.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-7 space-y-6 shadow-sm card-hover-effect">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50">
                      <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.category}</h3>
                      <p className="text-xs text-slate-500">Cross-cloud abstraction layer mapping</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold rounded-full border border-slate-200 dark:border-slate-700">
                    Domain #{idx + 1}
                  </span>
                </div>

                {/* 3 Clouds Service Mapping Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800/50 rounded-2xl space-y-2 relative overflow-hidden group hover:border-blue-400 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-700 dark:text-blue-400">
                        <Cloud className="w-4 h-4" /> Microsoft Azure
                      </div>
                      <span className="bg-blue-600/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">ARM Native</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white pt-1">{item.azure}</p>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl space-y-2 relative overflow-hidden group hover:border-amber-400 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-700 dark:text-amber-400">
                        <Cpu className="w-4 h-4" /> Amazon Web Services
                      </div>
                      <span className="bg-amber-600/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">AWS SDK v3</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white pt-1">{item.aws}</p>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl space-y-2 relative overflow-hidden group hover:border-emerald-400 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                        <Database className="w-4 h-4" /> Google Cloud Platform
                      </div>
                      <span className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">GCP Cloud Engine</span>
                    </div>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white pt-1">{item.gcp}</p>
                  </div>
                </div>

                {/* Behavioral & Pricing Analysis Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                      <DollarSign className="w-3.5 h-3.5" /> Pricing & Cost Difference
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{item.pricing}</p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      <BarChart3 className="w-3.5 h-3.5" /> Deployment Behaviour
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{item.deploymentBehaviour}</p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      <Shield className="w-3.5 h-3.5" /> Recovery & Failover
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{item.recoveryBehaviour}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
