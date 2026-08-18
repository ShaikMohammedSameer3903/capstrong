import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, DollarSign, Zap, Globe, Shield, ArrowRight, Cpu, Cloud, Database } from 'lucide-react';
import AnimatedPage from '../components/layout/AnimatedPage';

export default function SmartCloudRecommendation() {
  const [params, setParams] = useState({
    applicationType: 'Web Service',
    budgetMonthly: 500,
    performancePriority: 'High Performance',
    availabilityTarget: 99.99,
    region: 'us-east',
    trafficPattern: 'Variable Spike'
  });

  const [recommendation, setRecommendation] = useState<{
    recommendedCloud: string;
    providerName: string;
    recommendedService: string;
    confidenceScore: number;
    estimatedMonthlyCost: number;
    estimatedSavingsPct: number;
    performanceGainPct: number;
    reasons: string[];
    breakdown: { azureScore: number; awsScore: number; gcpScore: number };
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cloudops-local-token') || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (data.success) {
        setRecommendation(data.data);
      }
    } catch (err) {
      console.error('Error evaluating cloud recommendation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleEvaluate();
  }, []);

  return (
    <AnimatedPage>
      <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        {/* Glassmorphic Hero Banner */}
        <div className="gradient-header-purple rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>
          <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg glow-subtle-purple float-gentle">
                <Sparkles className="w-8 h-8 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500/20 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-400/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Decision Engine
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Smart Cloud Target Recommendations</h1>
                <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                  AI & empirical heuristic model recommending the optimal cloud target (Azure, AWS, or GCP) based on cost limits, SLA targets, and traffic profiles.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 text-right backdrop-blur-md">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Decision Model</div>
              <div className="text-xl font-extrabold text-amber-400">Multi-Cloud Heuristic V3</div>
            </div>
          </div>
        </div>

        {/* Input Form & Output Result Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workload Parameter Input Controls */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white border-b pb-3 border-slate-100 dark:border-slate-800">
              Workload Parameters
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Application Category</label>
                <select
                  value={params.applicationType}
                  onChange={e => setParams({ ...params, applicationType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:border-blue-500"
                >
                  <option value="Web Service">Microservice / Web API</option>
                  <option value="AI Engine">AI / ML Inference Pipeline</option>
                  <option value="Data Batch">Data Processing / ETL</option>
                  <option value="E-Commerce">E-Commerce Transactional System</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Monthly Budget Ceiling ($)</label>
                <input
                  type="number"
                  value={params.budgetMonthly}
                  onChange={e => setParams({ ...params, budgetMonthly: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Traffic Profile</label>
                <select
                  value={params.trafficPattern}
                  onChange={e => setParams({ ...params, trafficPattern: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:border-blue-500"
                >
                  <option value="Variable Spike">Variable Spike / Autoscaling</option>
                  <option value="Steady State">Steady State Constant</option>
                  <option value="Serverless">Serverless On-Demand</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Performance Priority</label>
                <select
                  value={params.performancePriority}
                  onChange={e => setParams({ ...params, performancePriority: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:border-blue-500"
                >
                  <option value="High Performance">Ultra Low Latency</option>
                  <option value="Balanced">Balanced Cost & Performance</option>
                  <option value="Cost Optimized">Maximum Cost Savings</option>
                </select>
              </div>

              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg glow-subtle-blue transition hover:scale-105 active:scale-95 disabled:opacity-50 mt-2"
              >
                {loading ? 'Evaluating Cloud Providers...' : 'Generate Recommendation'}
              </button>
            </div>
          </div>

          {/* Recommendation Output Display */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {recommendation ? (
              <>
                <div className="p-7 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-500/30 space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-3.5 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-full border border-emerald-500/40 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-emerald-500" /> Optimal Target: {recommendation.recommendedCloud}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">Confidence Score: {recommendation.confidenceScore}%</span>
                  </div>

                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">{recommendation.providerName}</h2>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mt-1">{recommendation.recommendedService}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2 text-xs">
                    <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block font-semibold">Est. Monthly Cost</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">${recommendation.estimatedMonthlyCost}/mo</span>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block font-semibold">Cost Advantage</span>
                      <span className="text-lg font-black text-amber-500">+{recommendation.estimatedSavingsPct}%</span>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block font-semibold">Speed Boost</span>
                      <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">+{recommendation.performanceGainPct}%</span>
                    </div>
                  </div>
                </div>

                {/* Architectural Explanation */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Architectural Rationales:</h3>
                  <div className="space-y-2.5">
                    {recommendation.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-750 text-xs text-slate-800 dark:text-slate-200 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold">Generating AI Cloud Target Recommendation...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
