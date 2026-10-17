# CLOUD-223: REST API & Telemetry Interface Documentation

* **Project Title:** Application Platform Abstraction Over Heterogeneous Cloud Infrastructure (CLOUD-223 / C2C-94)
* **Base URL:** `http://localhost:5000/api/v1` (Local) / `/api/v1` (Production)
* **Authentication Scheme:** Bearer Token (JWT) via `Authorization: Bearer <TOKEN>` header or Azure Entra ID OAuth 2.0 token
* **API Standard:** OpenAPI 3.0.0 compliant, JSON payloads, standardized error envelope

---

## 1. Authentication & Identity Endpoints

### 1.1 User Login
* **Method & Path:** `POST /api/v1/auth/login`
* **Purpose:** Authenticates user credentials and issues a signed JWT token with role claims.
* **Authentication:** None (Public)
* **Request Payload:**
```json
{
  "email": "lead.architect@cloudops.internal",
  "password": "SecurePassword123!"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr-9481",
    "name": "Shaik Mohammed Sameer",
    "email": "lead.architect@cloudops.internal",
    "role": "SuperAdmin",
    "tenant_id": "demo-org-001"
  }
}
```
* **Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid email or password",
  "code": "AUTH_CREDENTIALS_INVALID"
}
```

### 1.2 Session Status & Identity Verification
* **Method & Path:** `GET /api/v1/auth/me`
* **Purpose:** Returns the current authenticated identity, active session status, and tenant metadata.
* **Authentication:** Required (`Bearer Token`)

---

## 2. Cloud Provider & Account Management

### 2.1 List Cloud Provider Accounts
* **Method & Path:** `GET /api/v1/cloud-accounts`
* **Purpose:** Retrieves all connected cloud accounts across AWS, Azure, and GCP with live connectivity status.
* **Authentication:** Required (`Viewer`, `DevOps`, `PlatformAdmin`, `SuperAdmin`)
* **Success Response (200 OK):**
```json
[
  {
    "id": "ca-aws-01",
    "provider": "AWS",
    "account_name": "Production AWS EKS Cluster",
    "status": "Connected",
    "region": "us-east-1",
    "cluster_name": "eks-cloud223-prod"
  },
  {
    "id": "ca-azure-01",
    "provider": "AZURE",
    "account_name": "Azure Enterprise Landing Zone",
    "status": "Connected",
    "region": "eastus2",
    "cluster_name": "aks-cloud223-prod"
  },
  {
    "id": "ca-gcp-01",
    "provider": "GCP",
    "account_name": "Google Cloud Platform Autopilot",
    "status": "Connected",
    "region": "us-central1",
    "cluster_name": "gke-cloud223-prod"
  }
]
```

### 2.2 Verify Provider Credentials
* **Method & Path:** `POST /api/v1/cloud-accounts/:id/test-connection`
* **Purpose:** Proactively tests connectivity against AWS STS, Azure Resource Manager, or GCP Resource Manager.
* **Authentication:** Required (`PlatformAdmin`, `SuperAdmin`)

---

## 3. Deployment Engine & Multi-Cloud Pipelines

### 3.1 Trigger Multi-Cloud Deployment
* **Method & Path:** `POST /api/v1/deployments/create`
* **Purpose:** Initiates the 13-step concurrent deployment pipeline across selected target cloud providers.
* **Authentication:** Required (`DevOps`, `PlatformAdmin`, `SuperAdmin`)
* **Request Payload:**
```json
{
  "name": "enterprise-checkout-api",
  "version": "v2.4.1",
  "container_image": "cloudops/checkout-api:v2.4.1",
  "port": 8080,
  "replicas": 3,
  "cpu_limit": "500m",
  "memory_limit": "512Mi",
  "cloud_targets": ["AWS", "AZURE", "GCP"],
  "environment": "production"
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "deploymentId": "dep-1792232728172-f76a8f8d",
  "status": "Completed",
  "endpoints": {
    "AWS": "http://k8s-ingress-aws.elb.amazonaws.com",
    "AZURE": "https://enterprise-checkout-api-demo.azurewebsites.net",
    "GCP": "http://34.120.45.12"
  },
  "durationMs": 4200,
  "evidenceSealed": true
}
```

### 3.2 Get Deployment Execution Logs
* **Method & Path:** `GET /api/v1/deployments/:id/logs`
* **Purpose:** Retrieves structured step execution logs and event timings for audit and diagnostics.
* **Authentication:** Required

---

## 4. Infrastructure Difference & Parity Engine (`infraDiffEngine`)

### 4.1 Get Multi-Cloud Infrastructure Matrix
* **Method & Path:** `GET /api/v1/infra-difference/matrix`
* **Purpose:** Computes comparative performance variances across 10 dimensions between AWS, Azure, and GCP.
* **Authentication:** Required
* **Success Response (200 OK):**
```json
[
  {
    "category": "Storage IOPS & Throughput",
    "unit": "MB/s",
    "aws": 850.0,
    "azure": 620.0,
    "gcp": 790.0,
    "variancePct": 27.1,
    "leakageIdentified": true,
    "leakageRationale": "Storage throughput ceilings differ by disk SKU and bottleneck database-bound workloads."
  },
  {
    "category": "Network Policy & Latency",
    "unit": "ms",
    "aws": 102.0,
    "azure": 135.0,
    "gcp": 110.0,
    "variancePct": 32.3,
    "leakageIdentified": true,
    "leakageRationale": "Security-group connection tracking and regional routing create latency variance."
  },
  {
    "category": "Compute Startup / Cold-Start",
    "unit": "s",
    "aws": 2.1,
    "azure": 3.4,
    "gcp": 2.5,
    "variancePct": 61.9,
    "leakageIdentified": true,
    "leakageRationale": "Container runtime hypervisor overhead affects scale-from-zero cold-start timing."
  }
]
```

### 4.2 Run Ablation Analysis
* **Method & Path:** `POST /api/v1/infra-difference/ablation`
* **Purpose:** Evaluates system sensitivity by isolating individual measurement signals and recomputing leakage variance.

---

## 5. Portability & Behavioral Scoring (`portabilityEngine`)

### 5.1 Calculate Composite Portability Score
* **Method & Path:** `GET /api/v1/portability/score`
* **Purpose:** Computes overall portability rating based on Deployment Portability, Behavioral Parity, Recovery Resilience, and Evidence Integrity.
* **Success Response (200 OK):**
```json
{
  "compositeScore": 80.08,
  "deploymentPortability": 100.0,
  "behavioralParityScore": 33.33,
  "recoveryResilience": 100.0,
  "evidenceIntegrity": 100.0,
  "batchesEvaluated": 3,
  "standardDeviation": 47.14
}
```

---

## 6. Chaos Studio & Automated Recovery (`chaosEngine`)

### 6.1 Inject Fault Attack Vector
* **Method & Path:** `POST /api/v1/chaos/inject`
* **Purpose:** Injects a controlled failure scenario into a target cluster to evaluate resilience.
* **Request Payload:**
```json
{
  "scenario": "POD_FAILURE",
  "targetCloud": "AZURE",
  "targetService": "enterprise-checkout-api"
}
```
* **Success Response (200 OK):**
```json
{
  "experimentId": "exp-chaos-7481",
  "status": "Injected",
  "faultType": "POD_FAILURE",
  "target": "AZURE",
  "recoveryEvaluating": true
}
```

### 6.2 Get Recovery Evaluation Results
* **Method & Path:** `GET /api/v1/recovery/results/:experimentId`
* **Purpose:** Retrieves MTTD, MTTR, and health probe recovery status.
* **Success Response (200 OK):**
```json
{
  "experimentId": "exp-chaos-7481",
  "recovered": true,
  "meanTimeToDetectMs": 420,
  "meanTimeToRecoverMs": 2480,
  "probesSuccessful": 5,
  "evidenceSealed": true
}
```

---

## 7. Cryptographic Evidence Ledger

### 7.1 Retrieve Evidence Manifest
* **Method & Path:** `GET /api/v1/evidence/manifest`
* **Purpose:** Returns the active SHA-256 evidence manifest tracking all verified runs, negative tests, and KPIs.
* **Success Response (200 OK):**
```json
{
  "manifestVersion": "1.0.0",
  "totalFiles": 337,
  "generatedAt": "2026-10-17T10:20:46.374Z",
  "kpis": {
    "kpi1_leakagePoints": 3,
    "kpi2_varianceCategories": 5,
    "kpi3_parityScore": 33.33,
    "kpi4_repeatabilityStdDev": 0.0,
    "kpi5_recoveryRate": "100%"
  }
}
```

---

## 8. WebSocket / Real-Time Telemetry Hub

* **Protocol:** `ws://` / `wss://` (Socket.IO)
* **Namespace:** `/`
* **Key Events:**
  - `deployment:step` (Pushes current deployment step 1–13 with log payload)
  - `telemetry:stream` (Streams CPU, memory, latency, and throughput samples in real time)
  - `chaos:status` (Emits fault injection triggers and recovery probe ticks)
