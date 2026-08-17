# Deployment Flow & Adapter Architecture

## Overview
The CloudOps Deployment Engine executes deployments across Azure, AWS, and GCP using an adapter design pattern.

```
[ User Action: Deploy App ]
           │
           ▼
[ Validate App & Tenant Credentials ]
           │
           ▼
[ Read Application Spec & Env Vars ]
           │
           ▼
[ Resolve Provider Adapter via ProviderFactory ]
           │
 ┌─────────┼──────────┐
 ▼         ▼          ▼
Azure     AWS        GCP
Adapter   Adapter    Adapter
 │         │          │
 ▼         ▼          ▼
[ Execute Deployment & Stream Step Logs ]
           │
           ▼
[ Save Deployment Record, Logs & Metrics in DB ]
           │
           ▼
[ Return Real-Time Execution Status ]
```

---

## Provider Adapters Interface (`IDeploymentProvider`)

Every cloud adapter implements the following interface:

```javascript
class IDeploymentProvider {
  async deploy(appSpec, deploymentSpec) { ... }
  async rollback(deploymentId) { ... }
  async destroy(deploymentId) { ... }
  async scale(deploymentId, scaleConfig) { ... }
  async restart(deploymentId) { ... }
  async pause(deploymentId) { ... }
  async resume(deploymentId) { ... }
  async logs(deploymentId) { ... }
  async health(deploymentId) { ... }
  async metrics(deploymentId) { ... }
  async cost(deploymentId) { ... }
}
```

---

## Supported Deployment Targets

| Cloud Provider | Target Services | Deployment Types |
| :--- | :--- | :--- |
| **Azure** | Azure App Service, Azure Container Apps (ACA), AKS, Azure Functions, Azure VMs, Static Web Apps | Docker, Kubernetes, Serverless, VM, Microservice |
| **AWS** | AWS ECS Fargate, EKS, Elastic Beanstalk, AWS Lambda, EC2, App Runner | Docker, Kubernetes, Serverless, VM, Microservice |
| **GCP** | Google Cloud Run, GKE, Cloud Functions, Compute Engine, App Engine | Docker, Kubernetes, Serverless, VM, Microservice |
