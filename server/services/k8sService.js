// ============================================================
// Kubernetes Cluster Workloads & Telemetry Service
// REFACTORED: Queries real kubectl when available, otherwise
// returns only data from the resources DB table. No hardcoded
// node lists, pod lists, or cluster topology.
// ============================================================

const { getDatabase } = require('../db/database');
const { execSync } = require('child_process');

class K8sService {
  /**
   * Fetch Kubernetes cluster summary. Tries kubectl first, then DB.
   * @param {string} tenantId
   */
  async getClusterSummary(tenantId) {
    const db = await getDatabase();

    // 1. Try live kubectl
    const live = this._tryKubectl();
    if (live) return { ...live, source: 'kubectl', tenantId };

    // 2. Fall back to resources table
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

    // Build summary from DB resources
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
   * Attempt to query a real cluster via kubectl.
   * Returns null if kubectl is unavailable or cluster unreachable.
   */
  _tryKubectl() {
    try {
      // Check kubectl exists and cluster is reachable
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
