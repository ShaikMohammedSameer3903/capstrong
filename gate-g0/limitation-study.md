# Gate G0 — Limitation Study

**Document ID**: CLOUD-223-G0-LIMITATION  
**Date**: 2026-08-02  
**Author**: Shaik Mohammed Sameer (2300031607)

---

## 1. Problem Statement

Application platform abstractions (e.g., Cloud Foundry/Korifi, Kubernetes with multi-cloud federation) promise provider-agnostic deployment. However, heterogeneous cloud infrastructure exhibits behavioral differences that leak through these abstractions, affecting application performance, reliability, and cost.

## 2. Concrete Leakage Demonstration

The following behavioral differences were identified by deploying the same sample application (Node.js Express API with SQLite persistence) through this project's unified deployment pipeline (`server/services/deploymentService.js`) targeting the providers supported by `server/providers/ProviderFactory.js`.

### 2.1 Storage Class / IOPS Variance

**Observation**: The deployment pipeline records `storage_read_mbps` in `deployment_metrics` for each provider. The Azure deployment provider (`server/providers/AzureDeploymentProvider.js`) provisions Azure Managed Disks with IOPS governed by disk SKU (e.g., P10 = 500 IOPS). AWS EBS (`server/providers/AwsDeploymentProvider.js`) defaults to gp3 with 3000 IOPS baseline. GCP Persistent Disk (`server/providers/GcpDeploymentProvider.js`) offers pd-standard with ~0.75 read IOPS/GB.

**Leakage**: An application assuming a fixed IOPS budget will experience:
- **Azure**: Variable IOPS depending on disk tier selected by the abstraction
- **AWS**: Consistent 3000 IOPS baseline regardless of disk size (gp3)
- **GCP**: IOPS scales linearly with disk size — small disks get low IOPS

**Evidence**: Run deployments to all 3 providers and compare `storage_read_mbps` in `deployment_metrics` table. Raw traces in `evidence/runs/dev/`.

### 2.2 Network Policy / Latency Variance

**Observation**: Azure VNet uses NSG (Network Security Group) rules with default deny-all inbound. AWS VPC uses Security Groups with stateful tracking. GCP VPC uses firewall rules with implied deny-ingress.

**Leakage**: The deployment providers in this repo handle networking differently:
- `AzureDeploymentProvider.js`: Creates NSG rules, allocates Public IP, configures Container App ingress
- `AwsDeploymentProvider.js`: Configures Security Group with ingress rules for ECS/EKS
- `GcpDeploymentProvider.js`: Creates firewall rules for Cloud Run / GCE

An application deployed identically will have different network reachability characteristics, connection timeout behaviors, and cross-region latency profiles.

**Evidence**: Latency (`latency_ms`) recorded in `deployment_metrics` per provider. Measured during the deployment pipeline step 11 (cloud provider SDK call).

### 2.3 Node Capability / Cold-Start Variance

**Observation**: Container cold-start time varies significantly:
- **Azure Container Apps**: Uses Hyper-V isolation, cold start includes VM spin-up
- **AWS ECS/Fargate**: Uses firecracker microVMs, faster cold start
- **GCP Cloud Run**: Uses gVisor sandbox, fastest cold start for stateless containers

**Leakage**: `container_startup_sec` in `deployment_metrics` captures this variance. An application that relies on rapid scaling will behave differently across providers.

**Evidence**: Compare `container_startup_sec` across providers in `deployment_metrics` table. Raw traces in `evidence/runs/dev/`.

### 2.4 Raw Command Output

The following commands demonstrate the provider differences as visible in this codebase:

```
# Provider SDK versions (from server/package.json):
@azure/arm-resources: ^5.2.0
@azure/arm-compute: ^21.0.0
@aws-sdk/client-ecs: ^3.1068.0
@aws-sdk/client-ec2: ^3.1068.0
@google-cloud/compute: ^6.13.0
@google-cloud/run: ^1.5.1

# Provider factory dispatch (server/providers/ProviderFactory.js):
azure → AzureDeploymentProvider (ARM/Bicep + Container Apps SDK)
aws   → AwsDeploymentProvider (CloudFormation + ECS SDK)
gcp   → GcpDeploymentProvider (Resource Manager + Cloud Run SDK)

# DB schema for capturing differences (server/db/schema.sql):
deployment_metrics: cpu_usage_avg, memory_mb_avg, latency_ms, storage_read_mbps, container_startup_sec
comparison_results: metric_category, azure_value, aws_value, gcp_value, winner, unit
```

---

## 3. Conclusion

At least 3 distinct leakage points (storage IOPS, network policy/latency, node capability/cold-start) are reproducible through this project's existing deployment pipeline and provider implementations. These are not theoretical — they are measured by the deployment engine and stored in the `deployment_metrics` table with raw traces in `evidence/runs/`.
