import React, { useState, useEffect } from 'react';
import { Terminal, CheckCircle2, XCircle, Download, RefreshCw, Cpu, Server, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';

interface ToolStatus {
  toolName: string;
  status: 'INSTALLED' | 'MISSING' | 'ERROR';
  version: string | null;
  downloadUrl: string;
  installCommand: string;
  verificationCommand: string;
}

interface EnvStatus {
  key: string;
  value: string;
  isPresent: boolean;
  status: string;
  description: string;
  exampleValue: string;
  howToCreate: string;
  docLink: string;
}

export const InstallationWizard: React.FC = () => {
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [envVars, setEnvVars] = useState<EnvStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ToolStatus | null>(null);
  const [tab, setTab] = useState<'tools' | 'env'>('tools');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [toolsRes, envRes] = await Promise.all([
        fetch('/api/system/tools'),
        fetch('/api/env/status')
      ]);

      if (toolsRes.ok) {
        const data = await toolsRes.json();
        setTools(data.tools || []);
      }
      if (envRes.ok) {
        const data = await envRes.json();
        setEnvVars(data.variables || []);
      }
    } catch (err) {
      console.error('Failed to load system diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const installedCount = tools.filter(t => t.status === 'INSTALLED').length;
  const validEnvCount = envVars.filter(e => e.isPresent || e.status === 'VALID').length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-slate-100 max-w-6xl mx-auto my-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg glow-subtle-blue float-gentle">
            <Terminal className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> System Readiness Engine
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">System & Environment Diagnostic Wizard</h2>
            <p className="text-xs text-slate-400 mt-0.5">Production verification of host CLI binaries (Docker, kubectl, Helm, az, aws, gcloud) and environment credentials.</p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-md glow-subtle-blue transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning System...' : 'Re-scan System'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 my-6 border-b border-slate-800/80">
        <button
          onClick={() => setTab('tools')}
          className={`pb-3.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition ${
            tab === 'tools'
              ? 'border-blue-500 text-blue-400 scale-105'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          CLI Tools Diagnostic ({installedCount}/{tools.length})
        </button>
        <button
          onClick={() => setTab('env')}
          className={`pb-3.5 text-xs font-extrabold flex items-center gap-2 border-b-2 transition ${
            tab === 'env'
              ? 'border-blue-500 text-blue-400 scale-105'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          Environment Variables ({validEnvCount}/{envVars.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold">Scanning host system PATH and verifying executable binaries...</p>
        </div>
      ) : tab === 'tools' ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool) => {
              const isInstalled = tool.status === 'INSTALLED';
              return (
                <div
                  key={tool.toolName}
                  className={`p-5 rounded-2xl border transition-all duration-300 card-hover-effect ${
                    isInstalled
                      ? 'bg-slate-950/80 border-slate-800/90 hover:border-blue-500/40'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-white text-base font-mono">{tool.toolName}</span>
                    {isInstalled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                        <XCircle className="w-3.5 h-3.5" /> Missing
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-4 font-mono truncate bg-slate-900 p-2 rounded-lg border border-slate-800">
                    {isInstalled ? tool.version : 'Not detected on system PATH.'}
                  </p>

                  <div>
                    {!isInstalled && (
                      <button
                        onClick={() => setSelectedTool(tool)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Setup Guide
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="space-y-3.5">
            {envVars.map((env) => {
              const isOk = env.isPresent || env.status === 'VALID';
              return (
                <div
                  key={env.key}
                  className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition ${
                    isOk ? 'bg-slate-950/80 border-slate-800/80' : 'bg-red-950/20 border-red-500/30'
                  }`}
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-extrabold text-blue-400 text-sm">{env.key}</span>
                      {isOk ? (
                        <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">Configured</span>
                      ) : (
                        <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 bg-red-500/10 text-red-400 rounded-md border border-red-500/20">Missing</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{env.description}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Example: <code className="text-blue-300">{env.exampleValue}</code></p>
                  </div>

                  {!isOk && (
                    <div className="text-right shrink-0">
                      <a
                        href={env.docLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 transition"
                      >
                        Setup Documentation →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tool Setup Guide Modal */}
      {selectedTool && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 max-w-lg w-full shadow-2xl text-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Install {selectedTool.toolName} Binary
              </h3>
              <button onClick={() => setSelectedTool(null)} className="p-2 text-slate-400 hover:text-white rounded-xl">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold mb-1.5 block uppercase tracking-wider text-[11px]">Shell Installation Command:</label>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-blue-300 select-all font-bold">
                  {selectedTool.installCommand}
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold mb-1.5 block uppercase tracking-wider text-[11px]">Verification Command:</label>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-emerald-300 select-all font-bold">
                  {selectedTool.verificationCommand}
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={selectedTool.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg glow-subtle-blue transition"
                >
                  <Download className="w-4 h-4" /> Download Official Installer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallationWizard;
