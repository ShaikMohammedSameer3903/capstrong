class CloudProvider {
  constructor(account) {
    if (this.constructor === CloudProvider) {
      throw new Error("Abstract classes can't be instantiated.");
    }
    this.account = account; // { id, provider, tenant_id, account_id, etc. }
  }

  async getResources() {
    throw new Error("Method 'getResources()' must be implemented.");
  }

  async discoverResources() {
    return this.getResources();
  }

  async getMonitoring() {
    throw new Error("Method 'getMonitoring()' must be implemented.");
  }

  async discoverMetrics() {
    return this.getMonitoring();
  }

  async getSecurity() {
    throw new Error("Method 'getSecurity()' must be implemented.");
  }

  async discoverSecurity() {
    return this.getSecurity();
  }

  async getCost() {
    throw new Error("Method 'getCost()' must be implemented.");
  }

  async discoverCosts() {
    return this.getCost();
  }

  async getBackup() {
    throw new Error("Method 'getBackup()' must be implemented.");
  }

  async getCompliance() {
    throw new Error("Method 'getCompliance()' must be implemented.");
  }

  async discoverCompliance() {
    return this.getCompliance();
  }

  async getIncidents() {
    throw new Error("Method 'getIncidents()' must be implemented.");
  }

  async discoverRecommendations() {
    return [];
  }

  async startVM(resourceId) {
    throw new Error("Method 'startVM(resourceId)' must be implemented.");
  }

  async stopVM(resourceId) {
    throw new Error("Method 'stopVM(resourceId)' must be implemented.");
  }

  async restartVM(resourceId) {
    throw new Error("Method 'restartVM(resourceId)' must be implemented.");
  }
}

module.exports = CloudProvider;
