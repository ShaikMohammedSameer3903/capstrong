# CloudOps Enterprise Multi-Cloud Application Platform Architecture

## Executive Overview
The **CloudOps Multi-Cloud Application Platform** is a production-grade, enterprise platform designed for provisioning, deploying, monitoring, scaling, and optimizing workloads across **Microsoft Azure**, **Amazon Web Services (AWS)**, **Google Cloud Platform (GCP)**, and **On-Premises / Hybrid Kubernetes**.

```
+-----------------------------------------------------------------------------------+
|                                 React + Vite Frontend                             |
|    (Application Catalog, Deployment Center, Telemetry, FinOps, Security SOC)      |
+------------------------------------------+----------------------------------------+
                                           | HTTPS REST APIs / WSS
+------------------------------------------v----------------------------------------+
|                               Express.js Core Backend                             |
|          Tenant Isolation Middleware | JWT / OAuth2 Auth | Audit Engine           |
+------+-----------------+------------------+-------------------+-------------------+
       |                 |                  |                   |
+------v-------+  +------v-------+   +------v-------+   +-------v-------+
| Application  |  |  Deployment  |   | Telemetry &  |   | Containerization|
| Catalog Service| | Engine (IDepl|   | Monitoring   |   | & K8s Manifest  |
+--------------+  +--------------+   +--------------+   +---------------+
                         |
      +------------------+------------------+
      |                  |                  |
+-----v------+     +-----v------+     +-----v------+
|    Azure   |     |    AWS     |     |    GCP     |
|  Provider  |     |  Provider  |     |  Provider  |
|  Adapter   |     |  Adapter   |     |  Adapter   |
+-----+------+     +-----+------+     +-----+------+
      |                  |                  |
+-----v------+     +-----v------+     +-----v------+
| ARM / AKS /|     | ECS / EKS /|     | Cloud Run /|
| AppService |     | Fargate    |     | GKE        |
+------------+     +------------+     +------------+
```

---

## Core System Layers

### 1. Presentation Layer (Frontend)
- **Framework**: Vite + React 18 + TypeScript + Vanilla CSS + Lucide Icons + Recharts.
- **State Management**: Zustand store (`useAppStore`, `useCloudStore`, `useAuth`).
- **Features**: Real-time deployment status tracking, multi-cloud cost analytics, threat hunting & SOC, AI-driven rightsizing recommendations, report export (PDF/Excel/CSV).

### 2. Application & Deployment Control Layer (Backend)
- **Runtime**: Node.js v20+ / Express.js.
- **Provider Abstraction**: Standardized `IDeploymentProvider` interface with adapters for Azure, AWS, and GCP.
- **Containerization Engine**: `containerizationService.js` detects or auto-generates production `Dockerfile`, Kubernetes manifests (`Deployment`, `Service`, `Ingress`, `HPA`), and Helm charts (`Chart.yaml`, `values.yaml`).

### 3. Persistence & Telemetry Layer
- **Relational Storage**: Dual-engine support for SQLite (development/local) and PostgreSQL (production).
- **Telemetry Aggregation**: Integrated with OpenTelemetry, Prometheus, Azure Monitor, AWS CloudWatch, and GCP Monitoring.
- **Security & Audit**: Immutable `audit_logs` persistence for all administrative, deployment, and configuration actions.
