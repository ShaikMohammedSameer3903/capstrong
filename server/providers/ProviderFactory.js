const AzureDeploymentProvider = require('./AzureDeploymentProvider');
const AwsDeploymentProvider = require('./AwsDeploymentProvider');
const GcpDeploymentProvider = require('./GcpDeploymentProvider');

const AzureProvider = require('./azure/AzureProvider');
const AwsProvider = require('./aws/AwsProvider');
const GcpProvider = require('./GcpProvider');

class ProviderFactory {
  /**
   * Get resource discovery/management provider instance
   */
  static getProvider(account) {
    if (!account || !account.provider) {
      throw new Error("Invalid cloud account object provided.");
    }
    
    switch (account.provider.toLowerCase()) {
      case 'azure':
        return new AzureProvider(account);
      case 'aws':
        return new AwsProvider(account);
      case 'gcp':
        return new GcpProvider(account);
      default:
        throw new Error(`Unknown cloud provider: ${account.provider}`);
    }
  }

  /**
   * Get unified deployment abstraction provider instance
   * Satisfies KL University CLOUD-223 Requirement
   */
  static getDeploymentProvider(providerName, accountConfig = {}) {
    if (!providerName) {
      throw new Error("Target cloud provider name is required.");
    }

    const p = providerName.toLowerCase();
    switch (p) {
      case 'azure':
        return new AzureDeploymentProvider(accountConfig);
      case 'aws':
        return new AwsDeploymentProvider(accountConfig);
      case 'gcp':
        return new GcpDeploymentProvider(accountConfig);
      default:
        throw new Error(`Unsupported deployment target provider: ${providerName}`);
    }
  }
}

module.exports = ProviderFactory;
