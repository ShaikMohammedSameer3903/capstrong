# CLOUD-223: Production & Local Deployment Guide
**Application Platform Abstraction Over Heterogeneous Cloud Infrastructure**

* **Project Identifier:** CLOUD-223 / C2C-94
* **Lead Architect:** Shaik Mohammed Sameer (2300030621)
* **Infrastructure Engineer:** Khammapati Ganesh (2300033359)
* **Event:** SAMYAK-2026 Capstone Project Expo

---

## 1. Quick Start: Local Development Setup

### 1.1 Prerequisites
- **Node.js:** v20.x or v22.x LTS (compatible with v23+)
- **npm:** v10.0+
- **Git:** Installed and available on system PATH
- **Docker (Optional):** Docker Desktop for containerized deployment

### 1.2 Step-by-Step Local Run

```powershell
# 1. Clone repository
git clone https://github.com/ShaikMohammedSameer3903/capstrong.git
cd capstrong-main

# 2. Install backend dependencies
cd server
npm install
cd ..

# 3. Install frontend dependencies
npm install

# 4. Start Unified Development Environment (Frontend + Backend)
# Terminal 1: Backend API (Port 5000)
cd server
node index.js

# Terminal 2: Frontend Dashboard (Port 5173)
npm run dev
```

Open your browser to: `http://localhost:5173`
Backend API Swagger documentation: `http://localhost:5000/api-docs`

---

## 2. Environment Variables Configuration

Create a `.env` file in the root and in `server/` using the sanitized `.env.example` templates provided in the repository:

### 2.1 Backend Configuration (`server/.env`)
```env
# Server & Runtime Configuration
PORT=5000
NODE_ENV=production
JWT_SECRET=super-secure-production-jwt-token-replace-me-cloud223
SESSION_EXPIRY=24h

# Database Configuration (Leave blank for SQLite WAL mode)
# DATABASE_URL=postgresql://postgres:password@localhost:5432/cloudops
DATABASE_PATH=./cloudops.db

# Multi-Cloud Credentials (Optional for local simulation/demo)
# Azure Credentials
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-app-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_SUBSCRIPTION_ID=your-azure-subscription-id

# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# GCP Credentials
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

---

## 3. Containerized Deployment (Docker & Compose)

The repository provides multi-stage `Dockerfile.backend`, `Dockerfile.frontend`, and `docker-compose.yml`:

```powershell
# Build and run with Docker Compose
docker-compose up --build -d

# Verify running services
docker ps
```
Services exposed:
- `http://localhost:80` (Frontend via Nginx reverse proxy)
- `http://localhost:5000` (Backend API Service)

---

## 4. Kubernetes Production Deployment

The project provides production-grade Kubernetes manifests in `k8s-deployment.yaml`:

```powershell
# Apply manifests to active cluster
kubectl apply -f k8s-deployment.yaml

# Verify pod and ingress status
kubectl get pods -n cloudops
kubectl get ingress -n cloudops
```

Manifests included:
- `Deployment` (3 replicas, rolling update strategy, liveness & readiness probes)
- `Service` (ClusterIP + LoadBalancer Ingress)
- `HorizontalPodAutoscaler` (Target CPU: 70%, 2 to 10 pods)
- `NetworkPolicy` (Zero-trust namespace isolation)
- `ConfigMap` & `Secret` configurations

---

## 5. Health Checks & Telemetry Verification

The backend exposes three standardized probe endpoints:
* **Liveness Probe:** `GET /live` (Returns HTTP 200 `{ status: "ok" }`)
* **Readiness Probe:** `GET /ready` (Verifies database connectivity and returns HTTP 200 `{ ready: true }`)
* **Prometheus Metrics:** `GET /metrics` (Exposes OpenTelemetry scraped time-series data for Prometheus)

---

## 6. Troubleshooting & Common Issues

| Issue | Root Cause | Solution |
|:---|:---|:---|
| `SQLITE_ERROR: table resources has no column named updated_at` | Database initialized without V12 schema migration | Run migration or delete stale `cloudops.db`; database automatically auto-migrates with V12/V13 columns. |
| `Monitor Query notice: Cannot find module '@azure/monitor-query'` | Azure SDK query package missing | Run `npm install @azure/monitor-query` inside the `server/` directory. |
| Port 5000 in use | Another process running on port 5000 | Kill existing process or set `PORT=5001` in `server/.env`. |
| Cloud deployment fails due to credentials | Active cloud account not yet bound | The system automatically provides fallback execution with clearly marked sandbox notifications for classroom evaluation. |
