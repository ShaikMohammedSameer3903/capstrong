# Gate G0 — Dependency Confirmation

**Document ID**: CLOUD-223-G0-DEPENDENCIES  
**Date**: 2026-08-02

---

## Cloud Account / Tool / Licence Inventory

| Dependency | Configured In | Status | Notes |
|-----------|--------------|--------|-------|
| **Azure Subscription** | `.env.example`: `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | Available (credentials in `.env.development`) | Used for Container Apps, ARM deployment, resource discovery |
| **AWS Account** | `.env.example`: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | Available (credentials in `.env.development`) | Used for ECS/EC2 deployment, S3, STS identity |
| **GCP Project** | `.env.example`: `GCP_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` | Available (credentials in `.env.development`) | Used for Cloud Run, Compute Engine, resource discovery |
| **Docker CLI** | System PATH | Conditional — checked at runtime by `deploymentService.js` | Required for container builds; deployment proceeds without it |
| **kubectl CLI** | System PATH | Conditional — checked at runtime by `deploymentService.js` | Required for Kubernetes deployments |
| **Node.js 20.x** | `server/.node-version`, `server/package.json` | Required | Runtime for backend server |
| **SQLite 3** | `server/package.json`: `sqlite3@5.1.6` | Required (bundled) | Development database |
| **OpenTelemetry** | `server/package.json`, `server/telemetry.js` | Required (bundled) | Telemetry and tracing |

## Scope Reductions

| Unavailable Resource | Impact | Approved Reduction |
|---------------------|--------|-------------------|
| Live Kubernetes cluster (AKS/EKS/GKE) | Cannot execute real `kubectl` chaos experiments (KILL_POD, NODE_RESTART) | Chaos experiments fall back to Docker-level or simulation with fidelity documentation in `docs/o4-fault-simulation-method.md` |
| `tc` / `netem` kernel module | Cannot inject kernel-level network latency on all systems | Network latency falls back to application-level delay with fidelity documentation |
| Cloud Foundry / Korifi installation | Cannot deploy to Korifi directly | Korifi referenced as technology context only; testing uses native cloud providers |

## Conclusion

The project has sufficient infrastructure access (Azure + AWS + GCP credentials) to execute multi-cloud deployments and measure behavioral differences. Scope reductions for Kubernetes cluster and kernel-level chaos injection are documented with approved simulation fallbacks.
