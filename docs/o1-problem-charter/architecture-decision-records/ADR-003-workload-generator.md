# ADR-003: Workload Generator Strategy

**Status**: Accepted  
**Date**: 2026-08-02  
**Decision**: Use the deployment pipeline as the workload generator with sample applications from the application catalog

## Context

The capstone requires deploying "one sample application, unmodified, to at least two heterogeneous targets" and measuring behavioral differences. A workload generator is needed to drive deployments and collect metrics.

## Decision

Use the existing deployment pipeline (`server/services/deploymentService.js`) as the workload generator:

1. **Sample Applications**: Created via `server/services/applicationService.js` with fixed configuration (container image, env vars, deployment type)
2. **Deployment Trigger**: `deploymentService.deployApplication()` dispatches to the correct provider via `ProviderFactory`
3. **Metric Collection**: Each deployment writes `deployment_metrics` (CPU, memory, latency, storage IOPS, startup time)
4. **Evidence Recording**: Extended to write raw traces to `evidence/runs/dev/<timestamp>-<provider>.json`

### Workload Types Supported

| Type | Implementation | Target |
|------|---------------|--------|
| Docker | Default pipeline with Dockerfile generation | Container Apps / ECS / Cloud Run |
| Kubernetes | K8s manifest + Helm chart generation via `containerizationService.js` | AKS / EKS / GKE |
| Virtual Machine | VM provisioning pipeline | Azure VM / EC2 / GCE |
| Serverless | Function packaging pipeline | Azure Functions / Lambda / Cloud Functions |
| Static Web App | Static asset upload pipeline | Azure SWA / S3+CF / Firebase |

## Rationale

1. Reuses existing infrastructure — no separate workload generator tool needed
2. Metrics are collected at the deployment pipeline level, capturing real SDK behavior
3. The same application spec is deployed to all providers, ensuring fair comparison
4. Evidence writer integration provides automatic provenance tracking

## Consequences

- Workload diversity depends on sample applications created in the catalog
- Measurement granularity is limited to what the deployment pipeline captures
- For finer-grained metrics (e.g., microsecond latency), additional instrumentation would be needed
