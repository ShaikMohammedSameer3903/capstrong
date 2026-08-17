/**
 * Standardized IDeploymentProvider Interface
 * Enterprise Multi-Cloud Application Platform Abstraction.
 */
class IDeploymentProvider {
  /**
   * Deploy an application to target cloud provider
   */
  async deploy(appSpec, deploymentSpec) {
    throw new Error("Method 'deploy()' must be implemented.");
  }

  /**
   * Rollback a deployment to previous successful version
   */
  async rollback(deploymentId) {
    throw new Error("Method 'rollback()' must be implemented.");
  }

  /**
   * Destroy/delete an active deployment release
   */
  async destroy(deploymentId) {
    throw new Error("Method 'destroy()' must be implemented.");
  }

  async delete(deploymentId) {
    return this.destroy(deploymentId);
  }

  /**
   * Scale application replicas (horizontal or vertical)
   */
  async scale(deploymentId, scaleConfig) {
    throw new Error("Method 'scale()' must be implemented.");
  }

  /**
   * Restart deployment workloads
   */
  async restart(deploymentId) {
    throw new Error("Method 'restart()' must be implemented.");
  }

  /**
   * Pause application traffic / scaling
   */
  async pause(deploymentId) {
    throw new Error("Method 'pause()' must be implemented.");
  }

  /**
   * Resume application traffic / scaling
   */
  async resume(deploymentId) {
    throw new Error("Method 'resume()' must be implemented.");
  }

  /**
   * Retrieve real-time deployment logs
   */
  async logs(deploymentId) {
    throw new Error("Method 'logs()' must be implemented.");
  }

  async getLogs(deploymentId) {
    return this.logs(deploymentId);
  }

  /**
   * Check real-time application health probes
   */
  async health(deploymentId) {
    throw new Error("Method 'health()' must be implemented.");
  }

  async getStatus(deploymentId) {
    return this.health(deploymentId);
  }

  /**
   * Fetch runtime telemetry & performance metrics
   */
  async metrics(deploymentId) {
    throw new Error("Method 'metrics()' must be implemented.");
  }

  async monitor(deploymentId) {
    return this.metrics(deploymentId);
  }

  /**
   * Retrieve current spend & cost breakdown for deployment
   */
  async cost(deploymentId) {
    throw new Error("Method 'cost()' must be implemented.");
  }

  // ── Multi-Cloud Enterprise Abstraction (KL CLOUD-223 Requirements) ──

  async discoverResources() {
    throw new Error("Method 'discoverResources()' must be implemented.");
  }

  async deployApplication(appSpec, deploymentSpec) {
    return this.deploy(appSpec, deploymentSpec);
  }

  async collectMetrics(deploymentId) {
    return this.metrics(deploymentId);
  }

  async collectCost(deploymentId) {
    return this.cost(deploymentId);
  }

  async collectSecurity(deploymentId) {
    throw new Error("Method 'collectSecurity()' must be implemented.");
  }

  async collectHealth(deploymentId) {
    return this.health(deploymentId);
  }

  async collectBackups(deploymentId) {
    throw new Error("Method 'collectBackups()' must be implemented.");
  }

  async collectCompliance(deploymentId) {
    throw new Error("Method 'collectCompliance()' must be implemented.");
  }

  /**
   * Return capability matrix metadata for this cloud provider
   */
  getCapabilityMatrix() {
    return {
      provider: 'unknown',
      capabilities: {
        compute: false,
        deployment: false,
        monitoring: false,
        kubernetes: false,
        serverless: false,
        iac: false,
        autoScaling: false
      }
    };
  }

  /**
   * Normalize provider-specific deployment status into standardized CLOUD-223 contract status
   */
  normalizeStatus(rawStatus) {
    if (!rawStatus) return 'UNKNOWN';
    const s = String(rawStatus).toUpperCase();
    if (s.includes('RUNNING') || s.includes('SUCCEEDED') || s.includes('COMPLETED') || s.includes('ACTIVE') || s.includes('READY')) return 'RUNNING';
    if (s.includes('PROVISION') || s.includes('PENDING') || s.includes('BUILD') || s.includes('CREATING') || s.includes('QUEUED')) return 'PROVISIONING';
    if (s.includes('DEGRAD') || s.includes('WARNING') || s.includes('PARTIAL')) return 'DEGRADED';
    if (s.includes('FAIL') || s.includes('ERROR') || s.includes('CANCEL')) return 'FAILED';
    if (s.includes('STOP') || s.includes('PAUSE') || s.includes('TERMINATED')) return 'STOPPED';
    if (s.includes('DELETE') || s.includes('DESTROY')) return 'DELETING';
    return 'RUNNING';
  }

  /**
   * Normalize provider-specific health into standardized CLOUD-223 contract status
   */
  normalizeHealth(rawHealth) {
    if (!rawHealth) return 'HEALTHY';
    const h = String(rawHealth).toUpperCase();
    if (h.includes('HEALTHY') || h.includes('OK') || h.includes('UP') || h.includes('PASSED')) return 'HEALTHY';
    if (h.includes('DEGRAD') || h.includes('WARN')) return 'DEGRADED';
    if (h.includes('UNHEALTHY') || h.includes('FAIL') || h.includes('DOWN')) return 'UNHEALTHY';
    return 'UNKNOWN';
  }
}

module.exports = IDeploymentProvider;
