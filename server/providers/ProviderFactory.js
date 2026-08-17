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
      case 'k8s':
      case 'kubernetes':
        return {
          deploy: (appSpec, opts) => require('../services/k8sService').deployWorkload(appSpec, opts),
          getCapabilityMatrix: () => ProviderFactory.getCapabilityMatrix('kubernetes')
        };
      default:
        throw new Error(`Unsupported deployment target provider: ${providerName}`);
    }
  }

  /**
   * Return capability matrix metadata for a given provider
   */
  static getCapabilityMatrix(providerName) {
    const p = (providerName || '').toLowerCase();
    try {
      if (['aws', 'azure', 'gcp'].includes(p)) {
        const instance = ProviderFactory.getDeploymentProvider(p, {});
        if (typeof instance.getCapabilityMatrix === 'function') {
          return instance.getCapabilityMatrix();
        }
      }
    } catch (_) {}

    if (p === 'k8s' || p === 'kubernetes') {
      return {
        provider: 'kubernetes',
        capabilities: {
          compute: true,
          deployment: true,
          monitoring: true,
          kubernetes: true,
          serverless: false,
          iac: true,
          autoScaling: true
        }
      };
    }

    return {
      provider: providerName,
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
   * Return aggregate capability matrices for all supported providers
   */
  static getAllCapabilityMatrices() {
    return {
      aws: ProviderFactory.getCapabilityMatrix('aws'),
      azure: ProviderFactory.getCapabilityMatrix('azure'),
      gcp: ProviderFactory.getCapabilityMatrix('gcp'),
      kubernetes: ProviderFactory.getCapabilityMatrix('kubernetes')
    };
  }
}

module.exports = ProviderFactory;

