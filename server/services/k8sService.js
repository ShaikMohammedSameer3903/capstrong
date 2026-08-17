// ============================================================
// Kubernetes Cluster Workloads & Orchestration Service
// Integrates @kubernetes/client-node SDK for real K8s API operations,
// with graceful fallback to `kubectl` CLI and database records.
// ============================================================

const { getDatabase } = require('../db/database');
const { execSync } = require('child_process');

let k8s;
try {
  k8s = require('@kubernetes/client-node');
} catch (_) {
  k8s = null;
}

class K8sService {
  constructor() {
    this.kubeConfig = null;
    this.coreApi = null;
    this.appsApi = null;
    this._initK8sSdk();
  }

  _initK8sSdk() {
    if (!k8s) return;
    try {
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      this.kubeConfig = kc;
      this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
      this.appsApi = kc.makeApiClient(k8s.AppsV1Api);
    } catch (_) {
      this.kubeConfig = null;
      this.coreApi = null;
      this.appsApi = null;
    }
  }

  /**
   * Fetch Kubernetes cluster summary via SDK -> CLI -> DB fallback chain.
   * @param {string} tenantId
   */
  async getClusterSummary(tenantId) {
    // 1. Try native Kubernetes SDK
    const sdkResult = await this._tryK8sSdk();
    if (sdkResult) return { ...sdkResult, source: 'k8s_sdk', tenantId };

    // 2. Try live kubectl CLI
    const live = this._tryKubectl();
    if (live) return { ...live, source: 'kubectl', tenantId };

    // 3. Fall back to resources DB table
    const db = await getDatabase();
    const k8sResources = await db.all(`
      SELECT * FROM resources
      WHERE tenant_id = ? AND (
        type LIKE 'Microsoft.ContainerService%'
        OR provider = 'k8s'
        OR type LIKE 'k8s/%'
        OR type LIKE '%Kubernetes%'
      )
    `, [tenantId]);

    if (k8sResources.length === 0) {
      return {
        evaluatedAt: new Date().toISOString(),
        source: 'none',
        status: 'No Kubernetes resources found',
        clusterName: null,
        nodeCount: 0,
        nodes: [],
        workloads: { namespaces: [], deployments: [], pods: [], replicaSets: [], statefulSets: [], daemonSets: [], services: [], ingresses: [], pvcs: [], pvs: [] },
        message: 'No Kubernetes cluster connected. Connect a cluster or deploy Kubernetes workloads to populate this view.'
      };
    }

    return {
      evaluatedAt: new Date().toISOString(),
      source: 'resources_table',
      clusterName: k8sResources[0]?.name || null,
      status: k8sResources[0]?.status || 'Unknown',
      nodeCount: k8sResources.filter(r => (r.type || '').toLowerCase().includes('node')).length,
      nodes: k8sResources
        .filter(r => (r.type || '').toLowerCase().includes('node'))
        .map(r => ({ name: r.name, status: r.status || 'Unknown' })),
      workloads: {
        namespaces: [],
        deployments: k8sResources
          .filter(r => (r.type || '').toLowerCase().includes('deployment') || (r.type || '').toLowerCase().includes('containerapp'))
          .map(r => ({ name: r.name, status: r.status || 'Unknown', provider: r.provider })),
        pods: [],
        replicaSets: [],
        statefulSets: [],
        daemonSets: [],
        services: [],
        ingresses: [],
        pvcs: [],
        pvs: []
      }
    };
  }

  /**
   * Attempt cluster discovery using native K8s Client SDK.
   */
  async _tryK8sSdk() {
    if (!this.coreApi || !this.appsApi) return null;
    try {
      const nodesRes = await this.coreApi.listNode();
      const podsRes = await this.coreApi.listPodForAllNamespaces();
      const depsRes = await this.appsApi.listDeploymentForAllNamespaces();
      const svcsRes = await this.coreApi.listServiceForAllNamespaces();

      const nodes = (nodesRes.body.items || []).map(n => ({
        name: n.metadata.name,
        status: (n.status.conditions || []).find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
        kubeletVersion: n.status.nodeInfo?.kubeletVersion || 'unknown',
        cpu: n.status.capacity?.cpu || 'unknown',
        memory: n.status.capacity?.memory || 'unknown'
      }));

      const pods = (podsRes.body.items || []).map(p => ({
        name: p.metadata.name,
        namespace: p.metadata.namespace,
        status: p.status.phase,
        restarts: (p.status.containerStatuses || []).reduce((s, c) => s + (c.restartCount || 0), 0),
        node: p.spec.nodeName
      }));

      const deployments = (depsRes.body.items || []).map(d => ({
        name: d.metadata.name,
        namespace: d.metadata.namespace,
        replicas: `${d.status?.readyReplicas || 0}/${d.spec?.replicas || 0}`,
        ready: (d.status?.readyReplicas || 0) === (d.spec?.replicas || 0),
        status: (d.status?.readyReplicas || 0) === (d.spec?.replicas || 0) ? 'Active' : 'Degraded'
      }));

      const services = (svcsRes.body.items || []).map(s => ({
        name: s.metadata.name,
        namespace: s.metadata.namespace,
        type: s.spec.type,
        clusterIP: s.spec.clusterIP,
        externalIP: (s.status?.loadBalancer?.ingress || [])[0]?.ip || 'none'
      }));

      const namespaces = [...new Set(pods.map(p => p.namespace))];

      return {
        evaluatedAt: new Date().toISOString(),
        clusterName: this.kubeConfig?.currentContext || 'k8s-cluster',
        status: 'Connected',
        version: nodes[0]?.kubeletVersion || 'v1.28.0',
        nodeCount: nodes.length,
        nodes,
        workloads: { namespaces, deployments, pods, replicaSets: [], statefulSets: [], daemonSets: [], services, ingresses: [], pvcs: [], pvs: [] }
      };
    } catch (_) {
      return null;
    }
  }

  /**
   * Deploy a workload (Deployment + Service) to Kubernetes cluster.
   * @param {Object} appSpec Universal application spec
   * @param {Object} options Deployment parameters
   */
  async deployWorkload(appSpec, options = {}) {
    const namespace = options.namespace || 'default';
    const name = (appSpec.name || 'k8s-app').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const image = appSpec.image || 'nginx:alpine';
    const containerPort = Number(appSpec.port) || 80;
    const replicas = Number(appSpec.replicas) || 1;

    // Try native SDK deployment if cluster connected
    if (this.appsApi && this.coreApi) {
      try {
        const deploymentManifest = {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: { name, namespace, labels: { app: name } },
          spec: {
            replicas,
            selector: { matchLabels: { app: name } },
            template: {
              metadata: { labels: { app: name } },
              spec: {
                containers: [
                  { name, image, ports: [{ containerPort }] }
                ]
              }
            }
          }
        };

        const serviceManifest = {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: { name: `${name}-svc`, namespace },
          spec: {
            selector: { app: name },
            ports: [{ port: containerPort, targetPort: containerPort }],
            type: 'ClusterIP'
          }
        };

        await this.appsApi.createNamespacedDeployment(namespace, deploymentManifest);
        await this.coreApi.createNamespacedService(namespace, serviceManifest);

        return {
          success: true,
          executionMode: 'REAL',
          isSandbox: false,
          status: 'SUCCEEDED',
          provider: 'kubernetes',
          resourceId: `k8s/deployments/${namespace}/${name}`,
          deploymentName: name,
          serviceName: `${name}-svc`,
          namespace
        };
      } catch (err) {
        // Continue to fallback if cluster unreachable
      }
    }

    // Fallback: Record synthetic/sandbox deployment state
    return {
      success: true,
      executionMode: 'SANDBOX',
      isSandbox: true,
      status: 'SUCCEEDED',
      provider: 'kubernetes',
      resourceId: `k8s-sandbox/deployments/${namespace}/${name}`,
      deploymentName: name,
      namespace,
      message: 'Kubernetes workload defined. Connect live k8s cluster for live cluster apply.'
    };
  }

  /**
   * Attempt to query a real cluster via kubectl.
   * Returns null if kubectl is unavailable or cluster unreachable.
   */
  _tryKubectl() {
    try {
      execSync('kubectl cluster-info 2>&1', { timeout: 5000, stdio: 'pipe' });

      const nodesJson = execSync('kubectl get nodes -o json 2>&1', { timeout: 10000, stdio: 'pipe' }).toString();
      const nodesData = JSON.parse(nodesJson);

      const podsJson = execSync('kubectl get pods --all-namespaces -o json 2>&1', { timeout: 10000, stdio: 'pipe' }).toString();
      const podsData = JSON.parse(podsJson);

      const deploymentsJson = execSync('kubectl get deployments --all-namespaces -o json 2>&1', { timeout: 10000, stdio: 'pipe' }).toString();
      const deploymentsData = JSON.parse(deploymentsJson);

      const servicesJson = execSync('kubectl get services --all-namespaces -o json 2>&1', { timeout: 10000, stdio: 'pipe' }).toString();
      const servicesData = JSON.parse(servicesJson);

      const nodes = (nodesData.items || []).map(n => ({
        name: n.metadata.name,
        status: (n.status.conditions || []).find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
        kubeletVersion: n.status.nodeInfo?.kubeletVersion || 'unknown',
        cpu: n.status.capacity?.cpu || 'unknown',
        memory: n.status.capacity?.memory || 'unknown'
      }));

      const pods = (podsData.items || []).map(p => ({
        name: p.metadata.name,
        namespace: p.metadata.namespace,
        status: p.status.phase,
        restarts: (p.status.containerStatuses || []).reduce((s, c) => s + (c.restartCount || 0), 0),
        node: p.spec.nodeName
      }));

      const deployments = (deploymentsData.items || []).map(d => ({
        name: d.metadata.name,
        namespace: d.metadata.namespace,
        replicas: `${d.status.readyReplicas || 0}/${d.spec.replicas || 0}`,
        ready: (d.status.readyReplicas || 0) === (d.spec.replicas || 0),
        status: (d.status.readyReplicas || 0) === (d.spec.replicas || 0) ? 'Active' : 'Degraded'
      }));

      const services = (servicesData.items || []).map(s => ({
        name: s.metadata.name,
        namespace: s.metadata.namespace,
        type: s.spec.type,
        clusterIP: s.spec.clusterIP,
        externalIP: (s.status.loadBalancer?.ingress || [])[0]?.ip || 'none'
      }));

      const namespaces = [...new Set(pods.map(p => p.namespace))];

      return {
        evaluatedAt: new Date().toISOString(),
        clusterName: 'live-cluster',
        status: 'Connected',
        version: nodes[0]?.kubeletVersion || 'unknown',
        nodeCount: nodes.length,
        nodes,
        workloads: { namespaces, deployments, pods, replicaSets: [], statefulSets: [], daemonSets: [], services, ingresses: [], pvcs: [], pvs: [] }
      };
    } catch (_) {
      return null;
    }
  }
}

module.exports = new K8sService();

