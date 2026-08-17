import React, { useState, useEffect } from 'react';
import { GitBranch, Play, RefreshCw, RotateCcw, AlertTriangle, CheckCircle2, Clock, Activity, Terminal, Shield, Cpu, Cloud, Database, XCircle, Rocket, ChevronRight, Gauge, Zap, Timer, MemoryStick, ExternalLink, Sparkles, Trash2, Eye, ShieldCheck, DollarSign } from 'lucide-react';
import AnimatedPage from '../components/layout/AnimatedPage';

interface Application {
  id: string;
  name: string;
  version: string;
  container_image: string;
  cloudTargets: string[];
}

interface Deployment {
  id: string;
  application_id: string;
  application_name: string;
  target_cloud: string;
  version: string;
  status: 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Rollback' | 'Restarted' | 'Terminated' | 'Cancelled';
  duration_ms: number;
  deployed_by: string;
  created_at: string;
  logs?: Array<{ level: string; step: string; message: string; timestamp: string }>;
  metrics?: {
    cpu_usage_avg: number;
    memory_mb_avg: number;
    latency_ms: number;
    container_startup_sec: number;
  };
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  Completed: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: CheckCircle2, label: 'Completed' },
  Running: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: Activity, label: 'Running' },
  Failed: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', icon: XCircle, label: 'Failed' },
  Rollback: { bg: '#fffbeb', text: '#b45309', border: '#fde68a', icon: RotateCcw, label: 'Rollback' },
  Restarted: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff', icon: RefreshCw, label: 'Restarted' },
  Cancelled: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', icon: XCircle, label: 'Cancelled' },
};

const CLOUD_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  azure: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  aws: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  gcp: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
};

export default function DeploymentCenter() {
  const [apps, setApps] = useState<Application[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedCloud, setSelectedCloud] = useState('aws');
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [selectedType, setSelectedType] = useState('AWS S3 + CloudFront');
  const [deploying, setDeploying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeDeployment, setActiveDeployment] = useState<Deployment | null>(null);

  // Dry-Run Pre-Flight Modal
  const [showDryRunModal, setShowDryRunModal] = useState(false);
  const [dryRunData, setDryRunData] = useState<any | null>(null);
  const [runningDryRun, setRunningDryRun] = useState(false);

  // Delete Confirmation Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('cloudops-local-token') || localStorage.getItem('token') || '';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, depRes] = await Promise.all([
        fetch('/api/applications', { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/deployments', { headers: { Authorization: `Bearer ${getToken()}` } })
      ]);

      if (!appsRes.ok || !depRes.ok) return;

      const appsData = await appsRes.json();
      const depData = await depRes.json();

      if (appsData.success) {
        setApps(appsData.data || []);
        if (appsData.data?.length > 0 && !selectedAppId) {
          setSelectedAppId(appsData.data[0].id);
        }
      }
      if (depData.success) {
        setDeployments(depData.data || []);
        if (depData.data?.length > 0 && !activeDeployment) {
          fetchDeploymentDetails(depData.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading deployments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeploymentDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/deployments/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setActiveDeployment(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch deployment details:', err);
    }
  };

  // Connect SSE for Real-Time Logs when Active Deployment is Running
  useEffect(() => {
    if (!activeDeployment || activeDeployment.status !== 'Running') return;

    const eventSource = new EventSource(`/api/deployments/${activeDeployment.id}/events?token=${encodeURIComponent(getToken())}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'log') {
          setActiveDeployment(prev => {
            if (!prev) return null;
            const existingLogs = prev.logs || [];
            return {
              ...prev,
              logs: [...existingLogs, payload.data]
            };
          });
        } else if (payload.type === 'status') {
          setActiveDeployment(prev => prev ? { ...prev, status: payload.data.status } : null);
          fetchData();
        }
      } catch (e) {}
    };

    return () => {
      eventSource.close();
    };
  }, [activeDeployment?.id, activeDeployment?.status]);

  useEffect(() => {
    fetchData();
  }, []);

  const [deployError, setDeployError] = useState<string | null>(null);
  const [cleanupPrompt, setCleanupPrompt] = useState<{
    newId: string;
    oldId: string;
    appName: string;
    oldCloud: string;
  } | null>(null);

  const handleDryRun = async () => {
    if (!selectedAppId || !selectedCloud) return;
    setRunningDryRun(true);
    setDeployError(null);
    try {
      const res = await fetch('/api/deployments/dry-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          applicationId: selectedAppId,
          targetCloud: selectedCloud,
          region: selectedRegion,
          environment: 'production'
        })
      });
      const data = await res.json();
      if (data.success) {
        setDryRunData(data.data);
        setShowDryRunModal(true);
      } else {
        setDeployError(data.error || 'Dry run validation failed.');
      }
    } catch (err: any) {
      setDeployError(err.message || 'Dry run validation failed.');
    } finally {
      setRunningDryRun(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedAppId || !selectedCloud) return;
    
    setShowDryRunModal(false);
    const priorDeployment = deployments.find(d => 
      (d.application_id === selectedAppId || d.application_name === selectedAppId) && 
      (d.status === 'Completed' || d.status === 'Running')
    );

    setDeploying(true);
    setDeployError(null);
    setCleanupPrompt(null);

    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          applicationId: selectedAppId,
          targetCloud: selectedCloud,
          region: selectedRegion,
          environment: 'production'
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveDeployment(data.data);
        fetchData();

        if (priorDeployment && priorDeployment.id !== data.data.id) {
          const appObj = apps.find(a => a.id === selectedAppId);
          setCleanupPrompt({
            newId: data.data.id,
            oldId: priorDeployment.id,
            appName: appObj ? appObj.name : selectedAppId,
            oldCloud: priorDeployment.target_cloud || 'cloud'
          });
        }
      } else {
        setDeployError(data.error || 'Deployment failed.');
      }
    } catch (err: any) {
      console.error('Deployment execution failed:', err);
      setDeployError(err.message || 'Deployment execution failed.');
    } finally {
      setDeploying(false);
    }
  };

  const handleAction = async (action: 'rollback' | 'restart' | 'terminate', id: string) => {
    try {
      const res = await fetch(`/api/deployments/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchDeploymentDetails(id);
        fetchData();
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  };

  const handleDeleteDeployment = async (id: string) => {
    try {
      const res = await fetch(`/api/deployments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setDeletingId(null);
        if (activeDeployment?.id === id) {
          setActiveDeployment(null);
        }
        fetchData();
      }
    } catch (err) {
      console.error('Delete deployment failed:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', icon: Clock, label: status };
    const Icon = cfg.icon;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 12px', borderRadius: 20,
        background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
        fontSize: 11, fontWeight: 700,
        animation: status === 'Running' ? 'pulse 2s ease-in-out infinite' : 'none',
      }}>
        <Icon style={{ width: 12, height: 12 }} />
        {cfg.label}
      </span>
    );
  };

  const panelStyle: React.CSSProperties = {
    borderRadius: 16, overflow: 'hidden',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 6px -1px rgba(0,0,0,0.02)',
  };

  return (
    <AnimatedPage>
      <div style={{ padding: 24, minHeight: '100vh', background: '#f8fafc' }}>
        {/* Azure / AWS Portal Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          padding: '24px 28px', borderRadius: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
            }}>
              <Rocket style={{ width: 24, height: 24, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                AWS & Multi-Cloud Deployment Center
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                Deploy applications to AWS (S3+CloudFront, ECS Fargate, Lambda, EC2), Azure, or GCP
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            style={{
              width: 40, height: 40, borderRadius: 10, border: '1px solid #cbd5e1',
              background: '#ffffff', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
          >
            <RefreshCw style={{ width: 16, height: 16, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {deployError && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🛑 Deployment Notice: {deployError}</span>
            <button onClick={() => setDeployError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        )}

        {cleanupPrompt && (
          <div style={{
            marginBottom: 20, padding: '16px 20px', borderRadius: 14,
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1px solid #bfdbfe', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: '#2563eb', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  New Deployment is Live & Running! 🚀
                </h4>
                <p style={{ fontSize: 13, color: '#475569', margin: '3px 0 0' }}>
                  A previous active deployment exists for <strong>{cleanupPrompt.appName}</strong> on {cleanupPrompt.oldCloud.toUpperCase()}. Clean up CloudFormation infrastructure or keep both?
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={async () => {
                  await handleDeleteDeployment(cleanupPrompt.oldId);
                  setCleanupPrompt(null);
                }}
                style={{
                  padding: '9px 16px', borderRadius: 10, background: '#dc2626', color: '#ffffff',
                  fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                }}
              >
                Delete Previous Cloud Stack
              </button>
              <button
                onClick={() => setCleanupPrompt(null)}
                style={{
                  padding: '9px 16px', borderRadius: 10, background: '#ffffff', color: '#334155',
                  fontWeight: 700, fontSize: 12, border: '1px solid #cbd5e1', cursor: 'pointer'
                }}
              >
                Keep Both
              </button>
            </div>
          </div>
        )}

        {/* Deploy Launchpad */}
        <div style={{ ...panelStyle, marginBottom: 24 }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg, #d97706, #2563eb, #7c3aed)' }} />
          <div style={{ padding: '24px 28px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Play style={{ width: 18, height: 18, color: '#d97706' }} />
              Deploy Application Workload
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 1fr auto auto', gap: 16, alignItems: 'end' }}>
              {/* Step 1: App Selection */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  1. Choose Application
                </label>
                <select
                  value={selectedAppId}
                  onChange={e => setSelectedAppId(e.target.value)}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    background: '#ffffff', border: '1px solid #cbd5e1',
                    color: '#0f172a', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer',
                  }}
                >
                  {Array.from(new Map(apps.map(a => [a.name, a])).values()).map(app => (
                    <option key={app.id} value={app.id}>
                      {app.name} ({app.version ? (app.version.startsWith('v') ? app.version : `v${app.version}`) : 'v1.0.0'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Cloud & Target */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  2. Select Target Cloud & Deployment Target
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[
                    { id: 'aws', name: 'AWS', icon: Cpu, bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
                    { id: 'azure', name: 'Azure', icon: Cloud, bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
                    { id: 'gcp', name: 'GCP', icon: Database, bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
                  ].map(c => {
                    const isSelected = selectedCloud === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCloud(c.id);
                          if (c.id === 'aws') setSelectedType('AWS S3 + CloudFront');
                          else if (c.id === 'azure') setSelectedType('Azure Static Web Apps');
                        }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          padding: '9px 0', borderRadius: 8,
                          background: isSelected ? c.bg : '#ffffff',
                          border: `1px solid ${isSelected ? c.border : '#cbd5e1'}`,
                          color: isSelected ? c.text : '#475569',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <c.icon style={{ width: 14, height: 14 }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>

                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: '#ffffff', border: '1px solid #cbd5e1',
                    color: '#1e293b', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer',
                  }}
                >
                  {selectedCloud === 'aws' ? (
                    <>
                      <option value="AWS S3 + CloudFront">AWS S3 + CloudFront CDN (Static React/Vite)</option>
                      <option value="Docker">AWS ECR + ECS Fargate Container (Docker/API)</option>
                      <option value="AWS Lambda">AWS Lambda Serverless Function</option>
                      <option value="AWS EC2">AWS EC2 Virtual Machine Instance</option>
                    </>
                  ) : selectedCloud === 'azure' ? (
                    <>
                      <option value="Azure Static Web Apps">Azure Static Web App (React / SPA)</option>
                      <option value="Docker">Azure Container Apps / App Service (Docker)</option>
                      <option value="Kubernetes">Azure AKS Kubernetes Workload</option>
                      <option value="Azure Virtual Machine">Azure Virtual Machine</option>
                    </>
                  ) : (
                    <>
                      <option value="GCP Cloud Storage Static Hosting">GCP Cloud Storage Static Site</option>
                      <option value="Docker">GCP Cloud Run Container</option>
                      <option value="Serverless">GCP Cloud Functions</option>
                    </>
                  )}
                </select>
              </div>

              {/* Step 3: Region */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  3. AWS Region
                </label>
                <select
                  value={selectedRegion}
                  onChange={e => setSelectedRegion(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: '#ffffff', border: '1px solid #cbd5e1',
                    color: '#1e293b', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>

              {/* Pre-Flight Dry Run Button */}
              <button
                onClick={handleDryRun}
                disabled={runningDryRun || !selectedAppId}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 18px', borderRadius: 10,
                  background: '#f1f5f9', color: '#334155', fontWeight: 700, fontSize: 12,
                  border: '1px solid #cbd5e1', cursor: runningDryRun ? 'wait' : 'pointer',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                <ShieldCheck style={{ width: 15, height: 15, color: '#d97706' }} />
                Dry Run
              </button>

              {/* Step 4: Deploy Button */}
              <button
                onClick={handleDeploy}
                disabled={deploying || !selectedAppId}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '12px 24px', borderRadius: 10,
                  background: deploying ? '#93c5fd' : '#2563eb',
                  color: '#ffffff', fontWeight: 800, fontSize: 13, border: 'none', cursor: deploying ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)', transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {deploying ? (
                  <><RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Deploying...</>
                ) : (
                  <><Rocket style={{ width: 16, height: 16 }} /> Confirm & Deploy</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Split View: History & Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          {/* History Panel */}
          <div style={panelStyle}>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Deployments</h3>
                <span style={{
                  padding: '3px 10px', borderRadius: 12,
                  background: '#f1f5f9', color: '#475569',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {deployments.length} total
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
                {deployments.map(d => {
                  const isActive = activeDeployment?.id === d.id;
                  const cb = CLOUD_BADGES[d.target_cloud?.toLowerCase()] || CLOUD_BADGES.aws;
                  return (
                    <div
                      key={d.id}
                      onClick={() => fetchDeploymentDetails(d.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        background: isActive ? '#eff6ff' : '#ffffff',
                        border: `1px solid ${isActive ? '#93c5fd' : '#e2e8f0'}`,
                        transition: 'all 0.2s',
                        boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.08)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{d.application_name}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6,
                          background: cb.bg, color: cb.text, border: `1px solid ${cb.border}`,
                          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                        }}>
                          {d.target_cloud}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {getStatusBadge(d.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Deployment Details */}
          <div>
            {activeDeployment ? (
              <div style={panelStyle}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #d97706, #2563eb)' }} />
                <div style={{ padding: '24px 28px' }}>

                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
                    paddingBottom: 20, borderBottom: '1px solid #f1f5f9', marginBottom: 20,
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {activeDeployment.application_name}
                        </h3>
                        {getStatusBadge(activeDeployment.status)}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                        <span>ID:</span>{' '}
                        <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }}>{activeDeployment.id}</span>
                        <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                        <span>Target:</span> <span style={{ color: '#d97706', fontWeight: 800 }}>{activeDeployment.target_cloud.toUpperCase()}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleDeleteDeployment(activeDeployment.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 8,
                          background: '#fef2f2', color: '#b91c1c',
                          border: '1px solid #fecaca', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                        Delete Stack
                      </button>
                      <button
                        onClick={() => handleAction('rollback', activeDeployment.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 14px', borderRadius: 8,
                          background: '#fffbeb', color: '#b45309',
                          border: '1px solid #fde68a', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        <RotateCcw style={{ width: 13, height: 13 }} />
                        Rollback
                      </button>
                    </div>
                  </div>

                  {/* Live Website Banner */}
                  {(() => {
                    const liveUrl = (activeDeployment as any).endpoint_url || activeDeployment.logs?.find(l => l.step === '11_ENDPOINT_VERIFIED' || l.message?.includes('Application URL:'))?.message?.match(/https?:\/\/[^\s\)]+/)?.[0];
                    if (!liveUrl || activeDeployment.status === 'Failed') return null;
                    return (
                      <div style={{
                        padding: '18px 24px', borderRadius: 14, marginBottom: 20,
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        border: '1.5px solid #6ee7b7', boxShadow: '0 4px 14px rgba(16,185,129,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 12, background: '#059669', color: '#ffffff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <CheckCircle2 style={{ width: 24, height: 24 }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#065f46' }}>AWS DEPLOYMENT SUCCESSFUL</span>
                              <span style={{ padding: '2px 8px', borderRadius: 10, background: '#059669', color: '#ffffff', fontSize: 10, fontWeight: 800 }}>LIVE URL</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#047857', fontFamily: 'monospace' }}>
                              {liveUrl}
                            </div>
                          </div>
                        </div>

                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 20px', borderRadius: 10, background: '#059669', color: '#ffffff',
                            fontSize: 13, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                          }}
                        >
                          <span>Open Live Web App</span>
                          <ExternalLink style={{ width: 14, height: 14 }} />
                        </a>
                      </div>
                    );
                  })()}

                  {/* Real-time SSE Execution Console */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Terminal style={{ width: 16, height: 16, color: '#2563eb' }} />
                      Real-Time SSE Deployment Log Terminal
                      <span style={{
                        padding: '2px 8px', borderRadius: 8,
                        background: activeDeployment.status === 'Running' ? '#eff6ff' : '#f1f5f9',
                        color: activeDeployment.status === 'Running' ? '#1d4ed8' : '#475569',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {activeDeployment.status === 'Running' ? 'LIVE SSE' : `${(activeDeployment.logs || []).length} events`}
                      </span>
                    </h4>
                    <div style={{
                      background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b',
                      padding: '18px 20px', maxHeight: 320, overflowY: 'auto',
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}>
                      {(activeDeployment.logs || []).length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic', margin: 0 }}>Initializing SSE event stream...</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {activeDeployment.logs?.map((l, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11.5, lineHeight: 1.5 }}>
                              <span style={{
                                color: l.level === 'ERROR' ? '#f87171' : l.level === 'SUCCESS' ? '#34d399' : '#94a3b8',
                                fontWeight: 700, flexShrink: 0, minWidth: 165, fontSize: 10.5,
                              }}>
                                [{l.step || 'INFO'}]
                              </span>
                              <span style={{
                                color: l.level === 'ERROR' ? '#fca5a5' : l.level === 'SUCCESS' ? '#6ee7b7' : '#e2e8f0',
                                wordBreak: 'break-word',
                              }}>
                                {l.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...panelStyle, padding: 80, textAlign: 'center' }}>
                <GitBranch style={{ width: 40, height: 40, color: '#94a3b8', marginBottom: 16 }} />
                <p style={{ fontSize: 14, color: '#64748b', fontWeight: 600, margin: 0 }}>
                  Select a deployment to view real-time logs and AWS infrastructure details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dry Run Modal */}
        {showDryRunModal && dryRunData && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
          }}>
            <div style={{
              background: '#ffffff', borderRadius: 16, border: '1px solid #cbd5e1',
              maxWidth: 550, width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
              <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShieldCheck style={{ width: 20, height: 20, color: '#d97706' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>Pre-Flight Dry Run Inspection</h3>
                </div>
                <button onClick={() => setShowDryRunModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: dryRunData.authValid ? '#f0fdf4' : '#fffbeb', border: `1px solid ${dryRunData.authValid ? '#bbf7d0' : '#fde68a'}`, fontSize: 12, fontWeight: 700, color: dryRunData.authValid ? '#15803d' : '#b45309' }}>
                  ✓ {dryRunData.authDetails}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                    Expected CloudFormation Resources
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dryRunData.expectedResources.map((r: any, idx: number) => (
                      <div key={idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{r.type}</span>
                        <span style={{ color: '#475569' }}>{r.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Estimated Infrastructure Cost:</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>~${dryRunData.estimatedMonthlyCost.toFixed(2)}/mo</span>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowDryRunModal(false)} style={{ padding: '10px 18px', borderRadius: 8, background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleDeploy} style={{ padding: '10px 22px', borderRadius: 8, background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer' }}>Confirm & Execute AWS Deployment</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
