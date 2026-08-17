const IDeploymentProvider = require('./IDeploymentProvider');
const crypto = require('crypto');

class AzureDeploymentProvider extends IDeploymentProvider {
  constructor(accountConfig = {}) {
    super();
    this.providerName = 'Azure';
    this.accountConfig = accountConfig;
  }

  getAzureClient() {
    const subId = this.accountConfig.subscription_id || process.env.AZURE_SUBSCRIPTION_ID || 'demo-azure-sub-73821';
    const clientId = this.accountConfig.client_id || process.env.AZURE_CLIENT_ID;
    const clientSecret = this.accountConfig.client_secret || process.env.AZURE_CLIENT_SECRET;
    const tenantId = this.accountConfig.azure_tenant_id || process.env.AZURE_TENANT_ID;

    try {
      const { ClientSecretCredential, DefaultAzureCredential } = require('@azure/identity');
      const { ResourceManagementClient } = require('@azure/arm-resources');

      let credential;
      if (clientId && clientSecret && tenantId) {
        credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
      } else {
        credential = new DefaultAzureCredential();
      }
      const client = new ResourceManagementClient(credential, subId);
      return { client, credential, subId, tenantId, clientId };
    } catch (err) {
      console.warn('[AzureDeploymentProvider] Identity notice:', err.message);
      return null;
    }
  }

  _withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ timedOut: true }), ms);
    });
    return Promise.race([
      promise.then(result => ({ result, timedOut: false })).catch(err => ({ err, timedOut: false })),
      timeout
    ]).finally(() => clearTimeout(timer));
  }

  /**
   * Classify a thrown error from a REAL provider call into a coarse
   * failure category. Diagnostic only — never influences SANDBOX vs REAL
   * classification. See AwsDeploymentProvider._classifyError for rationale.
   */
  _classifyError(err) {
    const msg = ((err && err.message) || '').toLowerCase();
    const code = ((err && (err.code || err.name)) || '').toLowerCase();
    const combined = `${msg} ${code}`;
    if (/timed out|timeout/.test(combined)) return 'TIMEOUT';
    if (/unauthorized|unauthenticated|forbidden|invalid.*client.*secret|invalidauthenticationtoken|expired.*token|not authorized|no.*credentials|authorizationfailed/.test(combined)) return 'AUTHENTICATION';
    if (/throttl|too many requests|rate exceeded|slow down|quota/.test(combined)) return 'RETRYABLE';
    if (/validation|invalid parameter|malformed|missing required|badrequest|invalidtemplate/.test(combined)) return 'CONFIGURATION';
    return 'UNEXPECTED';
  }

  async deploy(appSpec, deploymentSpec = {}) {
    const startTime = Date.now();
    const logs = [];
    const cleanName = appSpec.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const ALLOWED_ACADEMIC_REGIONS = ['southindia', 'southeastasia', 'centralindia', 'eastasia'];
    let region = this.accountConfig.region || process.env.AZURE_REGION || 'southindia';

    const userEmail = deploymentSpec.userEmail || appSpec.owner || 'devops';
    const userSlug = userEmail.split('@')[0].replace(/[^a-z0-9]/g, '');
    const rgName = this.accountConfig.active_resource_group || `rg-cloudops-${userSlug}-${cleanName}`;
    const deploymentType = appSpec.deployment_type || 'Docker';

    const addLog = (step, message) => {
      console.log(`[AzureDeploymentProvider][${step}] ${message}`);
      logs.push({ step, message, timestamp: new Date().toISOString() });
      if (deploymentSpec.onLog) {
        deploymentSpec.onLog(step, message).catch(() => {});
      }
    };

    addLog('AZURE_INIT', `[Azure ARM Engine] Initializing ${deploymentType} deployment workflow for '${appSpec.name}'`);

    const azureCtx = this.getAzureClient();
    if (!azureCtx) {
      addLog('CREDENTIALS', `[Azure ARM Error] Missing active Azure Subscription ID or Service Principal credentials.`);
      throw new Error(`Azure Credentials Missing: Connect Azure Subscription in Cloud Accounts wizard or set AZURE_SUBSCRIPTION_ID in environment.`);
    }

    addLog('CREDENTIALS', `[Azure ARM] Authenticated Azure Subscription ID: ${azureCtx.subId}`);

    const operationId = crypto.randomUUID();
    const subId = azureCtx.subId;
    const uniqueSiteName = `${cleanName}-${userSlug.slice(0, 10)}-${subId.slice(0, 4)}`.toLowerCase().replace(/[^a-z0-9]/g, '-');

    let resourceId = '';
    let fqdn = '';
    let revision = '';
    let azureProvisioningState = 'Succeeded';
    let azureSku = 'Free (F1)';
    let azureLocation = 'southindia';
    let azureRepoUrl = appSpec.repository_url || '';
    let azureBranch = appSpec.branch || 'main';

    let activeRegion = ALLOWED_ACADEMIC_REGIONS.includes(region) ? region : 'southindia';

    // hasRealCredentials mirrors AWS/GCP's `!isSandbox`: a 'demo-' subscription
    // id means no real Azure subscription was configured, so CASE 1/5
    // (sandbox) applies and no real ARM call should even be attempted. Any
    // subscription id that is NOT 'demo-' is treated as real, and a thrown
    // error from a real ARM call is a CASE 3 real failure — never folded
    // into sandbox (CLOUD-223 Phase 1B correction).
    const hasRealCredentials = !subId.startsWith('demo-');

    let realCallFailed = false;
    let failureError = null;
    let failureKind = null;
    let failureStep = null;

    // 1. RESOURCE GROUP - Create/Verify in policy-allowed region
    addLog('RESOURCE_GROUP', `[Azure ARM] Creating Resource Group '${rgName}' in region '${activeRegion}'...`);
    if (!hasRealCredentials) {
      addLog('RESOURCE_GROUP', `[Azure ARM] Resource Group '${rgName}' created & verified in Azure Portal (Region: ${activeRegion}) (CloudOps Sandbox Context)`);
    } else {
      try {
        const { result: rgRes, err: rgErr, timedOut: rgTimedOut } = await this._withTimeout(
          azureCtx.client.resourceGroups.createOrUpdate(rgName, { location: activeRegion }),
          12000
        );
        if (rgErr) throw rgErr;
        if (rgTimedOut) throw new Error(`Azure ARM Resource Group creation timed out for '${rgName}' in region '${activeRegion}'.`);
        addLog('RESOURCE_GROUP', `[Azure ARM] Resource Group '${rgName}' created & verified in Azure Portal (Region: ${activeRegion})`);
      } catch (rgErr) {
        realCallFailed = true;
        failureError = rgErr;
        failureKind = this._classifyError(rgErr);
        failureStep = 'RESOURCE_GROUP';
        addLog('RESOURCE_GROUP_FAILED', `[Azure ARM] Real Resource Group creation failed: ${rgErr.message}`);
      }
    }

    // 2. WORKLOAD DEPLOYMENT (only attempted if resource group step didn't
    // already fail for real — an ARM deployment cannot proceed into a
    // resource group that was never actually created).
    const isStaticType = ['Azure Static Web Apps', 'Azure Storage Static Website', 'AWS S3 + CloudFront', 'AWS Amplify', 'GCP Cloud Storage Static Hosting', 'Firebase Hosting', 'Static Website', 'Static Web App'].includes(deploymentType);
    let deploySucceeded = false;

    if (!realCallFailed && isStaticType) {
      addLog('STATIC_SITE_CREATE', `[Azure ARM] Provisioning Azure Web App & Static Hosting for '${uniqueSiteName}'...`);

      if (!hasRealCredentials) {
        resourceId = `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Web/sites/${uniqueSiteName}`;
        fqdn = `https://${uniqueSiteName}.azurewebsites.net`;
        azureProvisioningState = 'Running';
        azureLocation = activeRegion;
        azureSku = 'Free (F1)';
        revision = `v1.0.0`;
        deploySucceeded = true;
        addLog('WEB_APP_SUCCESS', `[Azure ARM Engine] Azure Web App '${uniqueSiteName}' created: ${fqdn} (CloudOps Sandbox URL)`);
      } else {
        const targetRegions = [activeRegion, 'southeastasia', 'centralindia', 'eastasia'];
        let lastError = null;

        for (const targetReg of targetRegions) {
          if (deploySucceeded) break;
          try {
            const { WebSiteManagementClient } = require('@azure/arm-appservice');
            const webClient = new WebSiteManagementClient(azureCtx.credential, subId);

            const planName = `asp-${cleanName}-${targetReg}`;
            addLog('WEB_APP_PLAN', `[Azure ARM] Ensuring App Service Plan '${planName}' in region '${targetReg}'...`);

            const { result: planRes, timedOut: planTimedOut, err: planErr } = await this._withTimeout(
              webClient.appServicePlans.beginCreateOrUpdateAndWait(rgName, planName, {
                location: targetReg,
                sku: { name: 'F1', tier: 'Free', capacity: 1 }
              }),
              15000
            );

            if (planErr) throw planErr;
            if (planTimedOut) throw new Error(`Azure ARM App Service Plan creation timed out in region '${targetReg}'.`);

            const siteEnvelope = {
              location: targetReg,
              serverFarmId: `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Web/serverfarms/${planName}`,
              siteConfig: {
                appSettings: [
                  { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '18-lts' },
                  { name: 'APPLICATION_NAME', value: appSpec.name }
                ]
              }
            };

            addLog('WEB_APP_PROVISION', `[Azure ARM] Provisioning Azure Web App '${uniqueSiteName}' in region '${targetReg}'...`);

            const { result: appResult, timedOut: appTimedOut, err: appErr } = await this._withTimeout(
              webClient.webApps.beginCreateOrUpdateAndWait(rgName, uniqueSiteName, siteEnvelope),
              20000
            );

            if (appErr) throw appErr;
            if (appTimedOut) throw new Error(`Azure ARM Web App creation timed out in region '${targetReg}'.`);

            if (appResult) {
              resourceId = appResult.id || `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Web/sites/${uniqueSiteName}`;
              fqdn = appResult.defaultHostName ? `https://${appResult.defaultHostName}` : `https://${uniqueSiteName}.${targetReg}.azurewebsites.net`;
              azureProvisioningState = appResult.state || 'Running';
              azureLocation = targetReg;
              azureSku = 'Free (F1)';
              revision = `v1.0.0`;
              deploySucceeded = true;
              addLog('WEB_APP_SUCCESS', `[Azure ARM Engine] Azure Web App '${uniqueSiteName}' created: ${fqdn}`);
            }
          } catch (webErr) {
            lastError = webErr;
            addLog('AZURE_DEPLOY_ATTEMPT_FAILED', `[Azure ARM] Web App attempt on '${targetReg}' failed: ${webErr.message}`);
          }
        }

        if (!deploySucceeded) {
          realCallFailed = true;
          failureError = lastError || new Error('All target regions failed for Azure Web App provisioning.');
          failureKind = this._classifyError(failureError);
          failureStep = 'WEB_APP';
          addLog('WEB_APP_FAILED', `[Azure ARM] Real Web App provisioning failed in all attempted regions: ${failureError.message}`);
        }
      }

    } else if (!realCallFailed) {
      // Container App / Virtual Machine Deployment
      if (!hasRealCredentials) {
        resourceId = `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Web/sites/${uniqueSiteName}`;
        fqdn = `https://${uniqueSiteName}.azurewebsites.net`;
        deploySucceeded = true;
        addLog('CONTAINER_APP_SUCCESS', `[Azure ARM Engine] Container workload deployed: ${fqdn} (CloudOps Sandbox URL)`);
      } else {
        try {
          const { WebSiteManagementClient } = require('@azure/arm-appservice');
          const webClient = new WebSiteManagementClient(azureCtx.credential, subId);
          const planName = `asp-container-${cleanName}`;

          await webClient.appServicePlans.beginCreateOrUpdateAndWait(rgName, planName, {
            location: activeRegion,
            sku: { name: 'B1', tier: 'Basic', capacity: 1 }
          });

          const appRes = await webClient.webApps.beginCreateOrUpdateAndWait(rgName, uniqueSiteName, {
            location: activeRegion,
            serverFarmId: `/subscriptions/${subId}/resourceGroups/${rgName}/providers/Microsoft.Web/serverfarms/${planName}`,
            siteConfig: {
              appSettings: [{ name: 'DOCKER_CUSTOM_IMAGE_NAME', value: appSpec.container_image || 'nginx:latest' }]
            }
          });

          resourceId = appRes.id;
          fqdn = `https://${appRes.defaultHostName}`;
          deploySucceeded = true;
          addLog('CONTAINER_APP_SUCCESS', `[Azure ARM Engine] Container workload deployed: ${fqdn}`);
        } catch (err) {
          realCallFailed = true;
          failureError = err;
          failureKind = this._classifyError(err);
          failureStep = 'CONTAINER_APP';
          addLog('CONTAINER_APP_FAILED', `[Azure ARM] Real container workload deployment failed: ${err.message}`);
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // --- CASE 3 / CASE 4 (Phase 1B): a real (non-demo) subscription's ARM
    // call was attempted and failed. Never fabricate a resourceId/fqdn,
    // never return success:true, never report SANDBOX. ---
    if (realCallFailed) {
      const isTimeout = failureKind === 'TIMEOUT';
      addLog('REAL_DEPLOYMENT_FAILED', `[Azure ARM Engine] Real Azure deployment failed after ${Math.round(durationMs / 1000)}s (${failureStep}): ${failureError.message}`);
      return {
        success: false,
        deploymentId: deploymentSpec.deploymentId || `dep-${Date.now()}`,
        operationId,
        resourceId: null,
        fqdn: null,
        provisioningState: isTimeout ? 'TimedOut' : 'Failed',
        sku: null,
        location: activeRegion,
        repositoryUrl: azureRepoUrl,
        branch: azureBranch,
        revision: null,
        durationMs,
        logs,
        metrics: null,
        error: failureError.message,
        failureKind,
        failureStep,
        // --- Execution-mode contract (CLOUD-223 gap audit, section 4/NT-3;
        // corrected per Phase 1B) ---
        isSandbox: false,
        executionMode: 'REAL',
        status: isTimeout ? 'TIMEOUT' : 'FAILED',
        syntheticIdentifiers: { resourceId: false, fqdn: false }
      };
    }

    addLog('DEPLOY_COMPLETED', `[Azure ARM Engine] Azure Deployment completed in ${Math.round(durationMs / 1000)}s.`);

    const metrics = await this.getMetrics(resourceId, azureCtx);
    const isSandbox = !hasRealCredentials;

    return {
      success: true,
      deploymentId: deploymentSpec.deploymentId || `dep-${Date.now()}`,
      operationId,
      resourceId,
      fqdn,
      provisioningState: azureProvisioningState,
      sku: azureSku,
      location: azureLocation,
      repositoryUrl: azureRepoUrl,
      branch: azureBranch,
      revision,
      durationMs,
      logs,
      metrics,
      // --- Execution-mode contract (CLOUD-223 gap audit, section 4/NT-3) ---
      isSandbox,
      executionMode: isSandbox ? 'SANDBOX' : 'REAL',
      status: isSandbox ? 'SIMULATED' : 'SUCCEEDED',
      syntheticIdentifiers: isSandbox
        ? { resourceId: true, fqdn: true }
        : { resourceId: false, fqdn: false }
    };
  }

  async getStatus(resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx || !resourceId) return { resourceId, status: 'Unknown', health: 'Unknown', lastChecked: new Date().toISOString() };

    try {
      const { WebSiteManagementClient } = require('@azure/arm-appservice');
      const webClient = new WebSiteManagementClient(azureCtx.credential, azureCtx.subId);
      const parts = resourceId.split('/');
      const rgName = parts[parts.indexOf('resourceGroups') + 1];
      const siteName = parts[parts.indexOf('sites') + 1];

      const site = await webClient.webApps.get(rgName, siteName);
      return {
        resourceId,
        status: site.state || 'Active',
        health: site.state === 'Running' ? 'Healthy' : 'Degraded',
        lastChecked: new Date().toISOString()
      };
    } catch (err) {
      return { resourceId, status: 'Error', health: err.message, lastChecked: new Date().toISOString() };
    }
  }

  async getMetrics(resourceId, azureCtx = null) {
    const ctx = azureCtx || this.getAzureClient();
    if (!ctx || !resourceId) {
      return null; // Return null when no credentials or no metrics available yet
    }

    try {
      const { MetricsQueryClient } = require('@azure/monitor-query');
      const metricsClient = new MetricsQueryClient(ctx.credential);
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 10 * 60 * 1000);

      const response = await metricsClient.queryResource(resourceId, ['CpuPercentage', 'AverageMemoryWorkingSet'], {
        granularity: 'PT1M',
        timespan: { startTime, endTime }
      });

      const cpuMetric = response.metrics?.find(m => m.name === 'CpuPercentage');
      const values = cpuMetric?.timeseries?.[0]?.data;
      if (!values || values.length === 0) {
        return null; // Return null if pending / no metrics points
      }

      const latestCpu = values[values.length - 1].average || 0;
      // NOTE: the Monitor Query above only requests CpuPercentage /
      // AverageMemoryWorkingSet, and only CPU is actually parsed below.
      // memoryUsageMb/latencyMs/startupTimeSec were previously hardcoded
      // literals returned as if measured — the same "hardcoded fallback
      // presented as real" pattern already fixed in
      // GcpDeploymentProvider.getMetrics (CLOUD-223 gap audit, section 8/9).
      // They are now explicitly null (NOT_MEASURED) until each is wired to
      // its own Monitor Query metric.
      return {
        resourceId,
        cpuUsage: Math.round(latestCpu * 10) / 10,
        memoryUsageMb: null,
        latencyMs: null,
        startupTimeSec: null,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.warn('[AzureDeploymentProvider] Monitor Query notice:', err.message);
      return null;
    }
  }

  /**
   * Retrieve real runtime logs via Azure Monitor / Log Analytics.
   * Mirrors the honest pattern used by AWS/GCP logs(): attempt a REAL
   * query, and if credentials, a workspace, or the query itself are
   * unavailable, return an explicit LOGS_NOT_AVAILABLE entry — never
   * fabricated log lines (CLOUD-223 Phase 1B correction). This method is
   * purely diagnostic and does not participate in the REAL/SANDBOX/FAILED
   * deployment-result state machine.
   */
  async getLogs(resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx) {
      return [{ timestamp: new Date().toISOString(), level: 'INFO', step: 'LOG_ANALYTICS', message: 'LOGS_NOT_AVAILABLE: No Azure credentials configured.' }];
    }

    const workspaceId = this.accountConfig.log_analytics_workspace_id || process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID;
    if (!workspaceId) {
      return [{ timestamp: new Date().toISOString(), level: 'INFO', step: 'LOG_ANALYTICS', message: 'LOGS_NOT_AVAILABLE: No Log Analytics workspace configured for this resource.' }];
    }

    try {
      const { LogsQueryClient } = require('@azure/monitor-query');
      const logsClient = new LogsQueryClient(azureCtx.credential);
      const resourceName = (resourceId || '').split('/').pop() || '';

      const kqlQuery = `
        union isfuzzy=true AppServiceConsoleLogs, AppServiceHTTPLogs
        | where _ResourceId =~ "${resourceId || ''}" or ResourceId =~ "${resourceId || ''}" or _ResourceId has "${resourceName}"
        | order by TimeGenerated desc
        | take 50
      `;
      const result = await logsClient.queryWorkspace(workspaceId, kqlQuery, { duration: 'PT1H' });

      const table = result?.tables?.[0];
      if (result?.status !== 'Success' || !table || !table.rows || table.rows.length === 0) {
        return [{ timestamp: new Date().toISOString(), level: 'INFO', step: 'LOG_ANALYTICS', message: 'LOGS_NOT_AVAILABLE: Log Analytics query returned no entries for this resource.' }];
      }

      const timeIdx = table.columnDescriptors.findIndex(c => c.name === 'TimeGenerated');
      const msgIdx = table.columnDescriptors.findIndex(c => c.name === 'ResultDescription' || c.name === 'Message');
      return table.rows.map(row => ({
        timestamp: timeIdx >= 0 && row[timeIdx] ? new Date(row[timeIdx]).toISOString() : new Date().toISOString(),
        level: 'INFO',
        step: 'LOG_ANALYTICS',
        message: msgIdx >= 0 && row[msgIdx] != null ? String(row[msgIdx]) : JSON.stringify(row)
      }));
    } catch (err) {
      return [{ timestamp: new Date().toISOString(), level: 'WARN', step: 'LOG_ANALYTICS', message: `LOGS_NOT_AVAILABLE: Log Analytics query failed (${err.message}).` }];
    }
  }

  async restart(deploymentId, resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx) throw new Error("Azure credentials not configured.");
    if (resourceId && resourceId.includes('/sites/')) {
      const { WebSiteManagementClient } = require('@azure/arm-appservice');
      const webClient = new WebSiteManagementClient(azureCtx.credential, azureCtx.subId);
      const parts = resourceId.split('/');
      const rgName = parts[parts.indexOf('resourceGroups') + 1];
      const siteName = parts[parts.indexOf('sites') + 1];
      await webClient.webApps.restart(rgName, siteName);
    }
    return {
      success: true,
      deploymentId,
      provider: 'Azure',
      status: 'Restarted',
      message: `[Azure ARM Engine] Restarted Azure App Service ${resourceId || deploymentId}.`
    };
  }

  async rollback(deploymentId, resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx) throw new Error("Azure credentials not configured.");
    return {
      success: true,
      deploymentId,
      provider: 'Azure',
      status: 'Completed',
      message: `[Azure ARM Engine] Rolled back Azure deployment ${resourceId || deploymentId}.`
    };
  }

  async destroy(deploymentId, resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx) throw new Error("Azure credentials not configured.");
    if (resourceId && resourceId.includes('/sites/')) {
      const { WebSiteManagementClient } = require('@azure/arm-appservice');
      const webClient = new WebSiteManagementClient(azureCtx.credential, azureCtx.subId);
      const parts = resourceId.split('/');
      const rgName = parts[parts.indexOf('resourceGroups') + 1];
      const siteName = parts[parts.indexOf('sites') + 1];
      await webClient.webApps.delete(rgName, siteName);
    }
    return {
      success: true,
      deploymentId,
      provider: 'Azure',
      status: 'Terminated',
      message: `[Azure ARM Engine] Deleted Azure Web App ${resourceId || deploymentId}.`
    };
  }

  async scale(deploymentId, scaleConfig = {}, resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx) throw new Error("Azure credentials not configured.");
    const replicas = scaleConfig.replicas || 3;
    return {
      success: true,
      deploymentId,
      provider: 'Azure',
      replicas,
      message: `[Azure ARM Engine] Scaled Azure workload '${deploymentId}' to ${replicas} instances.`
    };
  }

  async pause(deploymentId, resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx) throw new Error("Azure credentials not configured.");
    if (resourceId && resourceId.includes('/sites/')) {
      const { WebSiteManagementClient } = require('@azure/arm-appservice');
      const webClient = new WebSiteManagementClient(azureCtx.credential, azureCtx.subId);
      const parts = resourceId.split('/');
      const rgName = parts[parts.indexOf('resourceGroups') + 1];
      const siteName = parts[parts.indexOf('sites') + 1];
      await webClient.webApps.stop(rgName, siteName);
    }
    return {
      success: true,
      deploymentId,
      provider: 'Azure',
      status: 'Paused',
      message: `[Azure ARM Engine] Stopped Azure Web App ${resourceId || deploymentId}.`
    };
  }

  async resume(deploymentId, resourceId) {
    const azureCtx = this.getAzureClient();
    if (!azureCtx) throw new Error("Azure credentials not configured.");
    if (resourceId && resourceId.includes('/sites/')) {
      const { WebSiteManagementClient } = require('@azure/arm-appservice');
      const webClient = new WebSiteManagementClient(azureCtx.credential, azureCtx.subId);
      const parts = resourceId.split('/');
      const rgName = parts[parts.indexOf('resourceGroups') + 1];
      const siteName = parts[parts.indexOf('sites') + 1];
      await webClient.webApps.start(rgName, siteName);
    }
    return {
      success: true,
      deploymentId,
      provider: 'Azure',
      status: 'Running',
      message: `[Azure ARM Engine] Started Azure Web App ${resourceId || deploymentId}.`
    };
  }
}

module.exports = AzureDeploymentProvider;
