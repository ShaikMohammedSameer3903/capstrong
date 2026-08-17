import React, { useState } from 'react';
import { FolderSearch, Code2, Server, Box, Layers, Play, CheckCircle2, AlertCircle, Loader2, Sparkles, Terminal } from 'lucide-react';

interface AnalysisResult {
  projectPath: string;
  detectedFiles: string[];
  language: string;
  runtime: string;
  framework: string;
  buildCommand: string;
  startCommand: string;
  containerType: string;
  deploymentStrategy: string;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasK8s: boolean;
  hasHelm: boolean;
}

interface ProjectAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: AnalysisResult) => void;
}

export const ProjectAnalysisModal: React.FC<ProjectAnalysisModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [projectPath, setProjectPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/projects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: projectPath.trim() || undefined })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to analyze project');
      }

      setResult(data.analysis);
      if (onImportComplete) {
        onImportComplete(data.analysis);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during project analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-7 shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Ambient Glow Effects */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none pulse-glow-bg"></div>

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg glow-subtle-blue">
              <FolderSearch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Stack Analyzer
                </span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Import & Auto-Analyze Project</h3>
              <p className="text-xs text-slate-400">Detect framework, language, runtime, build, container, & deployment artifacts.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">✕</button>
        </div>

        {/* Path Input */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Project Root Path <span className="text-slate-500 font-normal lowercase">(Leave blank for current workspace)</span>
            </label>
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="e.g. e:\cp-1-main or /home/user/my-app"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition shadow-inner"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition shadow-lg glow-subtle-blue shrink-0 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {loading ? 'Analyzing...' : 'Analyze Stack'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl mb-6 flex items-start gap-3 text-xs text-red-300">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-200">Analysis Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-6 space-y-5 text-xs shadow-inner">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-emerald-400 font-extrabold flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Technology Inspection Complete
              </span>
              <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 truncate max-w-xs">{result.projectPath}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Framework</span>
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-400" /> {result.framework}
                </span>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Language & Runtime</span>
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-400" /> {result.language}
                </span>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Build Command</span>
                <code className="text-blue-300 font-mono text-xs block truncate font-bold">
                  {result.buildCommand}
                </code>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Start Command</span>
                <code className="text-emerald-300 font-mono text-xs block truncate font-bold">
                  {result.startCommand}
                </code>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Container Recommendation</span>
                <span className="font-bold text-amber-300 text-xs flex items-center gap-2">
                  <Box className="w-4 h-4 text-amber-400" /> {result.containerType}
                </span>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Deployment Strategy</span>
                <span className="font-bold text-emerald-300 text-xs flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" /> {result.deploymentStrategy}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-slate-400 block mb-2 font-semibold text-xs">Detected Manifests & Configuration Files:</span>
              <div className="flex flex-wrap gap-2">
                {result.detectedFiles.map((file) => (
                  <span
                    key={file}
                    className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {file}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectAnalysisModal;
