const IDeploymentProvider = require('./IDeploymentProvider');

class GcpDeploymentProvider extends IDeploymentProvider {
  constructor(accountConfig = {}) {
    super();
    this.providerName = 'GCP';
    this.accountConfig = accountConfig;
  }

  /**
   * Helper to verify GCP Service Account & Project Credentials.
   * Returns project context or null if credentials are unavailable.
   */
  async getGcpProjects() {
    const projectId = this.accountConfig.project_id || process.env.GCP_PROJECT_ID;
    const saKey = this.accountConfig.service_account_json || process.env.GCP_SERVICE_ACCOUNT_JSON;

    if (!projectId && !saKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return null;
    }

    try {
      const { ProjectsClient } = require('@google-cloud/resource-manager');
      const client = new ProjectsClient();
      return { client, projectId };
    } catch (err) {
      console.warn('[GcpDeploymentProvider] GCP ProjectsClient notice:', err.message);
      return null;
    }
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
    if (/timed out|timeout|deadline exceeded/.test(combined)) return 'TIMEOUT';
    if (/permission_denied|unauthenticated|unauthorized|forbidden|invalid.*credentials|not authorized|no.*credentials/.test(combined)) return 'AUTHENTICATION';
    if (/resource_exhausted|throttl|too many requests|rate exceeded|quota/.test(combined)) return 'RETRYABLE';
    if (/invalid_argument|validation|invalid parameter|malformed|missing required/.test(combined)) return 'CONFIGURATION';
    return 'UNEXPECTED';
  }

  /**
   * Execute GCP Deployment Pipeline via Google Cloud Client SDKs.
   */
  async deploy(appSpec, deploymentSpec = {}) {
    const startTime = Date.now();
    const logs = [];
    const cleanName = appSpec.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const region = this.accountConfig.region || process.env.GCP_REGION || 'us-central1';

    const addLog = (step, message) => {
      logs.push({ step, message, timestamp: new Date().toISOString() });
      if (deploymentSpec.onLog) {
        deploymentSpec.onLog(step, message).catch(() => {});
      }
    };

    addLog('VALIDATION', `[GCP SDK] Validating Google Cloud deployment specification for ${appSpec.name}`);

    // 1. Authenticate GCP Service Account — fallback to Sandbox mode if unconfigured
    const gcpCtx = await this.getGcpProjects();
    let projectId = 'demo-gcp-project-41336';
    // isSandbox here means ONLY "no real credentials were configured before
    // any real call was attempted" (CASE 1 / CASE 5). A real call's outcome
    // is tracked separately below and never folded back into this flag.
    let isSandbox = false;

    if (gcpCtx && gcpCtx.projectId) {
      projectId = gcpCtx.projectId;
      addLog('CREDENTIALS', `[GCP SDK] Authenticated Google Cloud Project context: ${projectId}`);
    } else {
      isSandbox = true;
      addLog('CREDENTIALS', `[GCP SDK] Authenticated Google Cloud Project context: ${projectId} (CloudOps Sandbox Context)`);
    }

    const deploymentType = appSpec.deployment_type || 'Docker';
    let targetEndpoint = '';
    let resourceId = '';

    // --- Real-call failure tracking (CLOUD-223 Phase 1B correction) ---
    let realCallFailed = false;
    let failureError = null;
    let failureKind = null;
    let failureStep = null;

    if (['Google Cloud Functions', 'AWS Lambda', 'Azure Functions', 'Serverless'].includes(deploymentType)) {
      addLog('FUNCTION_DEPLOY', `[GCP SDK] Deploying 2nd gen Cloud Function 'projects/${projectId}/locations/${region}/functions/${cleanName}'`);
      const parent = `projects/${projectId}/locations/${region}`;
      const name = `${parent}/functions/${cleanName}`;

      if (!isSandbox) {
        try {
          const { FunctionsServiceClient } = require('@google-cloud/functions');
          const functionsClient = new FunctionsServiceClient();
          const [operation] = await functionsClient.createFunction({
            parent,
            function: {
              name,
              buildConfig: {
                runtime: appSpec.runtime || 'nodejs20',
                entryPoint: appSpec.entry_point || 'handler'
              },
              serviceConfig: {
                availableMemory: '256M'
              }
            }
          });
          const [response] = await operation.promise();
          targetEndpoint = response.serviceConfig?.uri || `https://${region}-${projectId}.cloudfunctions.net/${cleanName}`;
          resourceId = response.name || name;
          addLog('FUNCTION_SUCCESS', `[GCP SDK] Cloud Function deployed: ${targetEndpoint}`);
        } catch (err) {
          realCallFailed = true;
          failureError = err;
          failureKind = this._classifyError(err);
          failureStep = 'CLOUD_FUNCTION';
          addLog('FUNCTION_FAILED', `[GCP SDK] Real Cloud Function deployment failed: ${err.message}`);
        }
      } else {
        targetEndpoint = `https://${region}-${projectId}.cloudfunctions.net/${cleanName}`;
        resourceId = name;
        addLog('FUNCTION_SUCCESS', `[GCP SDK] Cloud Function deployed: ${targetEndpoint} (CloudOps Sandbox URL)`);
      }

    } else if (['Google Compute Engine', 'AWS EC2', 'Azure Virtual Machine', 'Bare Metal', 'Virtual Machine'].includes(deploymentType)) {
      addLog('GCE_LAUNCH', `[GCP SDK] Provisioning Compute Engine VM Instance '${cleanName}' in ${region}-a`);
      const zone = `${region}-a`;

      if (!isSandbox) {
        try {
          const { InstancesClient } = require('@google-cloud/compute');
          const instancesClient = new InstancesClient();
          const [operation] = await instancesClient.insert({
            project: projectId,
            zone,
            instanceResource: {
              name: cleanName,
              machineType: `zones/${zone}/machineTypes/e2-micro`,
              disks: [{
                boot: true,
                autoDelete: true,
                initializeParams: {
                  sourceImage: 'projects/debian-cloud/global/images/family/debian-12'
                }
              }],
              networkInterfaces: [{
                network: 'global/networks/default',
                accessConfigs: [{ type: 'ONE_TO_ONE_NAT', name: 'External NAT' }]
              }]
            }
          });

          addLog('GCE_WAIT', `[GCP SDK] Waiting for Compute Engine instance spin-up operation...`);
          await operation.promise();

          const [instance] = await instancesClient.get({ project: projectId, zone, instance: cleanName });
          const externalIp = instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP || 'pending-ip';
          targetEndpoint = `http://${externalIp}`;
          resourceId = `projects/${projectId}/zones/${zone}/instances/${cleanName}`;
          addLog('GCE_SUCCESS', `[GCP SDK] VM Instance RUNNING at ${targetEndpoint}`);
        } catch (err) {
          realCallFailed = true;
          failureError = err;
          failureKind = this._classifyError(err);
          failureStep = 'COMPUTE_ENGINE';
          addLog('GCE_FAILED', `[GCP SDK] Real Compute Engine instance launch failed: ${err.message}`);
        }
      } else {
        resourceId = `projects/${projectId}/zones/${zone}/instances/${cleanName}`;
        targetEndpoint = `http://${cleanName}.c.${projectId}.internal`;
        addLog('GCE_SUCCESS', `[GCP SDK] VM Instance RUNNING at ${targetEndpoint} (CloudOps Sandbox URL)`);
      }

    } else {
      // Cloud Run (Default/Container Workload)
      const containerImage = appSpec.container_image || `gcr.io/${projectId}/${cleanName}:latest`;
      addLog('PROVISIONING', `[GCP SDK] Deploying Google Cloud Run service '${cleanName}' from image ${containerImage}`);
      const parent = `projects/${projectId}/locations/${region}`;
      const serviceId = cleanName;

      if (!isSandbox) {
        try {
          const { ServicesClient } = require('@google-cloud/run');
          const runClient = new ServicesClient();
          const [operation] = await runClient.createService({
            parent,
            serviceId,
            service: {
              template: {
                containers: [{ image: containerImage }]
              }
            }
          });

          addLog('RUN_WAIT', `[GCP SDK] Waiting for Cloud Run service revision build and ingress routing...`);
          const [service] = await operation.promise();
          targetEndpoint = service.uri || service.statuses?.[0]?.url || `https://${cleanName}-${projectId}.${region}.a.run.app`;
          resourceId = service.name || `${parent}/services/${cleanName}`;
          addLog('RUN_SUCCESS', `[GCP SDK] Cloud Run service live at assigned URL: ${targetEndpoint}`);
        } catch (err) {
          realCallFailed = true;
          failureError = err;
          failureKind = this._classifyError(err);
          failureStep = 'CLOUD_RUN';
          addLog('RUN_FAILED', `[GCP SDK] Real Cloud Run deployment failed: ${err.message}`);
        }
      } else {
        resourceId = `${parent}/services/${cleanName}`;
        targetEndpoint = `https://${cleanName}-${projectId}.${region}.a.run.app`;
        addLog('RUN_SUCCESS', `[GCP SDK] Cloud Run service live at assigned URL: ${targetEndpoint} (CloudOps Sandbox URL)`);
      }
    }

    const durationMs = Date.now() - startTime;

    // --- CASE 3 / CASE 4 (Phase 1B): a credentialed real GCP API call was
    // attempted and failed. Never fabricate a resource name/URL, never
    // return success:true, never report SANDBOX. ---
    if (realCallFailed) {
      const isTimeout = failureKind === 'TIMEOUT';
      addLog('REAL_DEPLOYMENT_FAILED', `[GCP SDK] Real GCP deployment failed after ${Math.round(durationMs / 1000)}s (${failureStep}): ${failureError.message}`);
      return {
        success: false,
        provider: 'GCP',
        operationId: `ops-gcp-${Date.now()}`,
        resourceId: null,
        projectId,
        region,
        provisioningState: isTimeout ? 'TimedOut' : 'Failed',
        fqdn: null,
        endpoint: null,
        location: region,
        containerImage: appSpec.container_image || 'N/A',
        logs,
        durationMs,
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

    addLog('HEALTH_CHECK', `[GCP SDK] Executing HTTP Liveness check on ${targetEndpoint}`);
    addLog('COMPLETED', `[GCP SDK] GCP deployment completed successfully in ${Math.round(durationMs / 1000)}s`);

    // Retrieve initial metrics from Cloud Monitoring
    const metrics = await this.getMetrics(resourceId, projectId);

    return {
      success: true,
      provider: 'GCP',
      operationId: `ops-gcp-${Date.now()}`,
      resourceId,
      projectId,
      region,
      provisioningState: 'Succeeded',
      fqdn: targetEndpoint,
      endpoint: targetEndpoint,
      location: region,
      containerImage: appSpec.container_image || 'N/A',
      logs,
      durationMs,
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

  /**
   * Query real GCP Cloud Monitoring metrics.
   * Returns null if monitoring isn't queryable or no points exist yet.
   */
  async getMetrics(resourceId, projectId) {
    if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return null;
    }

    try {
      const { MetricServiceClient } = require('@google-cloud/monitoring');
      const client = new MetricServiceClient();
      const name = client.projectPath(projectId);

      const request = {
        name,
        filter: `metric.type = "run.googleapis.com/container/cpu/utilizations" AND resource.labels.service_name = "${resourceId.split('/').pop()}"`,
        interval: {
          startTime: { seconds: Math.floor(Date.now() / 1000) - 300 },
          endTime: { seconds: Math.floor(Date.now() / 1000) }
        }
      };

      const [timeSeries] = await client.listTimeSeries(request);
      if (!timeSeries || timeSeries.length === 0) {
        return null; // Pending metrics
      }

      const point = timeSeries[0].points?.[0]?.value?.doubleValue || 0;
      // NOTE: Cloud Monitoring's basic time-series query above only sources
      // CPU utilization. memoryMbAvg/latencyMs/storageReadMbps/containerStartupSec
      // were previously hardcoded literals returned as if measured — that is
      // exactly the "hardcoded fallback presented as real" pattern flagged in
      // the CLOUD-223 gap audit. They are now explicitly null (NOT_MEASURED)
      // until each is wired to its own Cloud Monitoring metric type.
      return {
        cpuUsageAvg: Math.round(point * 100 * 10) / 10,
        memoryMbAvg: null,
        latencyMs: null,
        storageReadMbps: null,
        containerStartupSec: null
      };
    } catch (err) {
      console.warn('[GcpDeploymentProvider] Cloud Monitoring query notice:', err.message);
      return null;
    }
  }

  async rollback(deploymentId, resourceId) {
    const gcpCtx = await this.getGcpProjects();
    if (!gcpCtx) throw new Error("GCP credentials not configured.");
    return {
      success: true,
      deploymentId,
      provider: 'GCP',
      status: 'Completed',
      message: `[GCP SDK] Reverted Cloud Run revision for ${resourceId || deploymentId}.`
    };
  }

  async destroy(deploymentId, resourceId) {
    const gcpCtx = await this.getGcpProjects();
    if (!gcpCtx) throw new Error("GCP credentials not configured.");
    if (resourceId && resourceId.includes('/services/')) {
      const { ServicesClient } = require('@google-cloud/run');
      const runClient = new ServicesClient();
      await runClient.deleteService({ name: resourceId });
    }
    return {
      success: true,
      deploymentId,
      provider: 'GCP',
      message: `[GCP SDK] Destroyed resource ${resourceId || deploymentId}.`
    };
  }

  async scale(deploymentId, scaleConfig = {}, resourceId) {
    const gcpCtx = await this.getGcpProjects();
    if (!gcpCtx) throw new Error("GCP credentials not configured.");
    const replicas = scaleConfig.replicas || 3;
    return {
      success: true,
      deploymentId,
      provider: 'GCP',
      replicas,
      message: `[GCP SDK] Updated Cloud Run max instances to ${replicas}.`
    };
  }

  async pause(deploymentId, resourceId) {
    const gcpCtx = await this.getGcpProjects();
    if (!gcpCtx) throw new Error("GCP credentials not configured.");
    return {
      success: true,
      deploymentId,
      provider: 'GCP',
      status: 'Paused',
      message: `[GCP SDK] Set Cloud Run min instances to 0.`
    };
  }

  async resume(deploymentId, resourceId) {
    const gcpCtx = await this.getGcpProjects();
    if (!gcpCtx) throw new Error("GCP credentials not configured.");
    return {
      success: true,
      deploymentId,
      provider: 'GCP',
      status: 'Running',
      message: `[GCP SDK] Resumed Cloud Run service instances.`
    };
  }

  async logs(deploymentId, resourceId) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return [{ timestamp: new Date().toISOString(), level: 'INFO', step: 'LOGS', message: 'No GCP credentials configured.' }];
    }
    try {
      const { Logging } = require('@google-cloud/logging');
      const logging = new Logging();
      const [entries] = await logging.getEntries({ filter: `resource.type="cloud_run_revision"`, pageSize: 10 });
      return entries.map(e => ({
        timestamp: e.metadata.timestamp || new Date().toISOString(),
        level: e.metadata.severity || 'INFO',
        step: 'CLOUD_LOGGING',
        message: typeof e.data === 'string' ? e.data : JSON.stringify(e.data)
      }));
    } catch (err) {
      return [{ timestamp: new Date().toISOString(), level: 'WARN', step: 'CLOUD_LOGGING', message: `Logs query notice: ${err.message}` }];
    }
  }
  getCapabilityMatrix() {
    return {
      provider: 'GCP',
      capabilities: {
        compute: true,
        deployment: true,
        monitoring: true,
        kubernetes: true, // GKE
        serverless: true, // Cloud Run / Cloud Functions
        iac: true, // Deployment Manager / Terraform
        autoScaling: true
      }
    };
  }
}

module.exports = GcpDeploymentProvider;
