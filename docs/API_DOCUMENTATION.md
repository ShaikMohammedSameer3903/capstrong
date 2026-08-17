# REST API Documentation

## Authentication & Headers
All requests must include JWT authentication and Tenant headers:
```
Authorization: Bearer <JWT_TOKEN>
X-Tenant-ID: <TENANT_ID>
```

---

## Endpoints Summary

### 1. Applications API (`/api/applications`)
- **`GET /api/applications`**: Fetch all applications for tenant.
- **`GET /api/applications/:id`**: Fetch application details by ID.
- **`POST /api/applications`**: Create new application in catalog.
- **`PUT /api/applications/:id`**: Update existing application.
- **`DELETE /api/applications/:id`**: Delete application from catalog.

### 2. Deployments API (`/api/deployments`)
- **`GET /api/deployments`**: List active and historical deployments.
- **`GET /api/deployments/:id`**: Get deployment details, logs, and metrics.
- **`POST /api/deployments`**: Trigger a deployment (`{ applicationId, targetCloud }`).
- **`POST /api/deployments/:id/rollback`**: Rollback deployment to previous build.
- **`POST /api/deployments/:id/restart`**: Restart deployment workloads.
- **`POST /api/deployments/:id/scale`**: Scale replicas (`{ replicas: 5 }`).
- **`POST /api/deployments/:id/pause`**: Pause workload traffic.
- **`POST /api/deployments/:id/resume`**: Resume workload traffic.
- **`POST /api/deployments/:id/terminate`**: Destroy deployment resources.
- **`GET /api/deployments/manifests/:applicationId`**: Retrieve auto-generated Dockerfile & Kubernetes manifests.

### 3. Monitoring & Telemetry API (`/api/monitoring`)
- **`GET /api/monitoring/metrics`**: Fetch live system/cloud telemetry (CPU, Memory, Disk, Latency).
- **`GET /api/monitoring/cost`**: Fetch cost consumption breakdown.
- **`GET /api/monitoring/cost/unified`**: Consolidated multi-cloud cost view (Azure + AWS + GCP).

### 4. FinOps & Cost Management (`/api/finops`)
- **`GET /api/finops/summary`**: Get monthly spend, forecast, and budget metrics.
- **`GET /api/finops/breakdown`**: Cost breakdown by service, department, and provider.
- **`GET /api/finops/wastes`**: Detect idle instances, unattached disks, and unassociated IPs.

### 5. Security & Incidents API (`/api/incidents`)
- **`GET /api/incidents`**: Fetch active security incidents and alerts.
- **`POST /api/incidents/:id/acknowledge`**: Acknowledge security incident ticket.
- **`POST /api/incidents/:id/resolve`**: Mark incident ticket resolved.

### 6. Reports API (`/api/reports`)
- **`GET /api/reports/executive`**: Retrieve executive operational summary.
- **`POST /api/reports/generate`**: Trigger server-side PDF, Excel, or CSV report generation.
