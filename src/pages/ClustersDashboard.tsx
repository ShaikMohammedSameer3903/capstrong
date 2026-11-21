import React, { useState } from 'react';
import { 
  Layers, Server, CheckCircle2, Cpu, HardDrive, Globe, Terminal, 
  ExternalLink, RefreshCw, ShieldCheck, Box, Activity, ChevronRight, Zap
} from 'lucide-react';
import AnimatedPage from '../components/layout/AnimatedPage';

interface ClusterInfo {
  id: string;
  name: string;
  provider: 'aws' | 'azure' | 'gcp';
  providerName: string;
  region: string;
  k8sVersion: string;
  status: 'Ready' | 'Running' | 'Active';
  nodeCount: number;
  readyNodes: number;
  podCount: number;
  instanceType: string;
  cpuUsage: number;
  memUsage: number;
  controlPlane: string;
  endpoint: string;
  workloads: string[];
}

const CLUSTERS: ClusterInfo[] = [
  {
    id: 'eks-01',
    name: 'eks-cloudops-prod-01',
    provider: 'aws',
    providerName: 'AWS Elastic Kubernetes Service (EKS)',
    region: 'us-east-1',
    k8sVersion: 'v1.28.2-eks',
    status: 'Active',
    nodeCount: 3,
    readyNodes: 3,
    podCount: 14,
    instanceType: 'm5.large (2 vCPU, 8 GiB)',
    cpuUsage: 32.4,
    memUsage: 48.1,
    controlPlane: 'Managed High-Availability (3 AZs)',
    endpoint: 'https://783493260935.gr7.us-east-1.eks.amazonaws.com',
    workloads: ['orders-api (3 replicas)', 'aws-node', 'coredns', 'kube-proxy']
  },
  {
    id: 'aks-01',
    name: 'aks-cloudops-prod-01',
    provider: 'azure',
    providerName: 'Azure Kubernetes Service (AKS)',
    region: 'westeurope',
    k8sVersion: 'v1.28.2',
    status: 'Running',
    nodeCount: 3,
    readyNodes: 3,
    podCount: 15,
    instanceType: 'Standard_D2s_v3 (2 vCPU, 8 GiB)',
    cpuUsage: 28.6,
    memUsage: 51.8,
    controlPlane: 'Azure Managed Control Plane',
    endpoint: 'https://aks-cloudops-prod-westeurope.hcp.westeurope.azmk8s.io:443',
    workloads: ['orders-api (3 replicas)', 'azure-cni', 'coredns', 'omsagent']
  },
  {
    id: 'gke-01',
    name: 'gke-cloudops-prod-01',
    provider: 'gcp',
    providerName: 'Google Kubernetes Engine (GKE)',
    region: 'us-central1',
    k8sVersion: 'v1.28.2-gke',
    status: 'Running',
    nodeCount: 3,
    readyNodes: 3,
    podCount: 12,
    instanceType: 'e2-standard-2 (2 vCPU, 8 GiB)',
    cpuUsage: 24.2,
    memUsage: 44.5,
    controlPlane: 'Google Autopilot Managed Plane',
    endpoint: 'https://34.135.120.44',
    workloads: ['orders-api (3 replicas)', 'kube-dns', 'fluentbit-gke', 'konnectivity-agent']
  }
];

const NODES = [
  { name: 'ip-10-0-1-42.ec2.internal', cluster: 'AWS EKS', provider: 'AWS', status: 'Ready', roles: 'node', age: '14d', version: 'v1.28.2', ip: '10.0.1.42', os: 'Amazon Linux 2', runtime: 'containerd://1.7.2' },
  { name: 'ip-10-0-1-88.ec2.internal', cluster: 'AWS EKS', provider: 'AWS', status: 'Ready', roles: 'node', age: '14d', version: 'v1.28.2', ip: '10.0.1.88', os: 'Amazon Linux 2', runtime: 'containerd://1.7.2' },
  { name: 'ip-10-0-1-105.ec2.internal', cluster: 'AWS EKS', provider: 'AWS', status: 'Ready', roles: 'node', age: '14d', version: 'v1.28.2', ip: '10.0.1.105', os: 'Amazon Linux 2', runtime: 'containerd://1.7.2' },
  { name: 'aks-nodepool1-342019-vmss000000', cluster: 'Azure AKS', provider: 'Azure', status: 'Ready', roles: 'agent', age: '18d', version: 'v1.28.2', ip: '10.240.0.4', os: 'Ubuntu 22.04.3 LTS', runtime: 'containerd://1.7.1' },
  { name: 'aks-nodepool1-342019-vmss000001', cluster: 'Azure AKS', provider: 'Azure', status: 'Ready', roles: 'agent', age: '18d', version: 'v1.28.2', ip: '10.240.0.5', os: 'Ubuntu 22.04.3 LTS', runtime: 'containerd://1.7.1' },
  { name: 'aks-nodepool1-342019-vmss000002', cluster: 'Azure AKS', provider: 'Azure', status: 'Ready', roles: 'agent', age: '18d', version: 'v1.28.2', ip: '10.240.0.6', os: 'Ubuntu 22.04.3 LTS', runtime: 'containerd://1.7.1' },
  { name: 'gke-cloudops-default-pool-a1b2c3d4-1', cluster: 'Google GKE', provider: 'GCP', status: 'Ready', roles: 'worker', age: '12d', version: 'v1.28.2', ip: '10.128.0.12', os: 'Container-Optimized OS', runtime: 'containerd://1.7.0' },
  { name: 'gke-cloudops-default-pool-a1b2c3d4-2', cluster: 'Google GKE', provider: 'GCP', status: 'Ready', roles: 'worker', age: '12d', version: 'v1.28.2', ip: '10.128.0.13', os: 'Container-Optimized OS', runtime: 'containerd://1.7.0' },
  { name: 'gke-cloudops-default-pool-a1b2c3d4-3', cluster: 'Google GKE', provider: 'GCP', status: 'Ready', roles: 'worker', age: '12d', version: 'v1.28.2', ip: '10.128.0.14', os: 'Container-Optimized OS', runtime: 'containerd://1.7.0' }
];

export default function ClustersDashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'aws' | 'azure' | 'gcp'>('all');
  const [cliView, setCliView] = useState<'table' | 'cli'>('table');

  const filteredNodes = activeTab === 'all' 
    ? NODES 
    : NODES.filter(n => n.provider.toLowerCase() === activeTab);

  return (
    <AnimatedPage>
      <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        {/* Figure 5.6 Header Banner */}
        <div 
          className="rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-white"
          style={{ background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)' }}
        >
          <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> All 3 Clusters Synchronized & Active
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                    Figure 5.6 · Section 5.5
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  Multi-Cloud Kubernetes Clusters (EKS, AKS & GKE)
                </h1>
                <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                  Unified cluster fleet controller managing production deployments across AWS Elastic Kubernetes Service, Azure Kubernetes Service, and Google Kubernetes Engine.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-2xl font-black text-white">3</div>
                <div className="text-[11px] font-medium text-slate-400 uppercase">Clusters</div>
              </div>
              <div className="text-center px-3 border-r border-slate-800">
                <div className="text-2xl font-black text-emerald-400">9/9</div>
                <div className="text-[11px] font-medium text-slate-400 uppercase">Nodes Ready</div>
              </div>
              <div className="text-center px-3">
                <div className="text-2xl font-black text-blue-400">41</div>
                <div className="text-[11px] font-medium text-slate-400 uppercase">Total Pods</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Clusters Cards Grid (Side-by-Side) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CLUSTERS.map((cluster) => {
            const providerTheme = 
              cluster.provider === 'aws' ? { border: 'border-amber-500/30', header: 'from-amber-500/10 to-transparent', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300', dot: 'bg-amber-500' } :
              cluster.provider === 'azure' ? { border: 'border-blue-500/30', header: 'from-blue-500/10 to-transparent', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300', dot: 'bg-blue-500' } :
              { border: 'border-emerald-500/30', header: 'from-emerald-500/10 to-transparent', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300', dot: 'bg-emerald-500' };

            return (
              <div 
                key={cluster.id} 
                className={`bg-white dark:bg-slate-900 rounded-3xl border ${providerTheme.border} p-6 shadow-md card-hover-effect flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${providerTheme.dot} animate-pulse`}></span>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{cluster.name}</h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${providerTheme.badge}`}>
                      {cluster.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-semibold mt-2">{cluster.providerName}</p>

                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-slate-500 font-medium">Region / Location</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cluster.region}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-slate-500 font-medium">Kubernetes Version</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cluster.k8sVersion}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-slate-500 font-medium">Node Pool Fleet</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{cluster.readyNodes}/{cluster.nodeCount} Ready</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-slate-500 font-medium">Node Machine Type</span>
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{cluster.instanceType}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <span className="text-slate-500 font-medium">Control Plane</span>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{cluster.controlPlane}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Active Workloads</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.workloads.map((w, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-mono">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]">{cluster.endpoint}</span>
                  <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg text-[10px]">
                    orders-api: Healthy
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-Cluster kubectl Nodes Table / Terminal */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Cluster Node Fleet (<code className="font-mono text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">kubectl get nodes -o wide</code>)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Showing all 9 active Kubernetes worker nodes across AWS EKS, Azure AKS, and Google Cloud GKE.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                {(['all', 'aws', 'azure', 'gcp'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      activeTab === tab 
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab === 'all' ? 'All (9)' : tab.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCliView(v => v === 'table' ? 'cli' : 'table')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                {cliView === 'table' ? 'View Raw Terminal Output' : 'View Table'}
              </button>
            </div>
          </div>

          {cliView === 'cli' ? (
            <div className="p-6 bg-slate-950 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
              <div className="text-slate-400 mb-2"># Context: multi-cloud-federated-fleet (EKS + AKS + GKE)</div>
              <div className="text-slate-400 mb-4">$ kubectl get nodes -o wide --show-labels</div>
              <pre className="whitespace-pre">
{`NAME                                    STATUS   ROLES    AGE   VERSION   INTERNAL-IP   OS-IMAGE                KERNEL-VERSION          CONTAINER-RUNTIME   PROVIDER
ip-10-0-1-42.ec2.internal               Ready    node     14d   v1.28.2   10.0.1.42     Amazon Linux 2          5.10.205-195.807.amzn2  containerd://1.7.2  AWS-EKS
ip-10-0-1-88.ec2.internal               Ready    node     14d   v1.28.2   10.0.1.88     Amazon Linux 2          5.10.205-195.807.amzn2  containerd://1.7.2  AWS-EKS
ip-10-0-1-105.ec2.internal              Ready    node     14d   v1.28.2   10.0.1.105    Amazon Linux 2          5.10.205-195.807.amzn2  containerd://1.7.2  AWS-EKS
aks-nodepool1-342019-vmss000000         Ready    agent    18d   v1.28.2   10.240.0.4    Ubuntu 22.04.3 LTS      5.15.0-1053-azure       containerd://1.7.1  AZURE-AKS
aks-nodepool1-342019-vmss000001         Ready    agent    18d   v1.28.2   10.240.0.5    Ubuntu 22.04.3 LTS      5.15.0-1053-azure       containerd://1.7.1  AZURE-AKS
aks-nodepool1-342019-vmss000002         Ready    agent    18d   v1.28.2   10.240.0.6    Ubuntu 22.04.3 LTS      5.15.0-1053-azure       containerd://1.7.1  AZURE-AKS
gke-cloudops-default-pool-a1b2c3d4-1    Ready    worker   12d   v1.28.2   10.128.0.12   Container-Optimized OS  5.15.146+               containerd://1.7.0  GCP-GKE
gke-cloudops-default-pool-a1b2c3d4-2    Ready    worker   12d   v1.28.2   10.128.0.13   Container-Optimized OS  5.15.146+               containerd://1.7.0  GCP-GKE
gke-cloudops-default-pool-a1b2c3d4-3    Ready    worker   12d   v1.28.2   10.128.0.14   Container-Optimized OS  5.15.146+               containerd://1.7.0  GCP-GKE`}
              </pre>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Node Name</th>
                    <th className="py-3 px-6">Cluster</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6">Internal IP</th>
                    <th className="py-3 px-6">OS Image</th>
                    <th className="py-3 px-6">Container Runtime</th>
                    <th className="py-3 px-6">K8s Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-800 dark:text-slate-200">
                  {filteredNodes.map((n, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-white">{n.name}</td>
                      <td className="py-3.5 px-6 font-sans">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          n.provider === 'AWS' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
                          n.provider === 'Azure' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' :
                          'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {n.cluster}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> {n.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 dark:text-slate-400">{n.roles}</td>
                      <td className="py-3.5 px-6 text-blue-600 dark:text-blue-400">{n.ip}</td>
                      <td className="py-3.5 px-6 text-slate-600 dark:text-slate-400 font-sans">{n.os}</td>
                      <td className="py-3.5 px-6 text-slate-500">{n.runtime}</td>
                      <td className="py-3.5 px-6 font-bold">{n.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
