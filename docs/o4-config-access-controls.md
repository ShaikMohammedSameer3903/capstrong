# O4 Config & Access Controls Documentation

**Document ID**: CLOUD-223-O4-ACCESS  
**Date**: 2026-08-02  

## Overview
This document specifies the Role-Based Access Control (RBAC) and Tenant Isolation mechanisms implemented across the platform abstraction layer.

## Implementation Structure

1. **Tenant Context Resolution**: `server/middleware/tenantContext.js`
   - Resolves `req.tenantId` and `req.userId` from JWT tokens / headers.
   - Enforces DB-based tenant auto-provisioning and role lookup.

2. **Role Hierarchy & Authorization**: `server/middleware/rbac.js`
   - Roles: `SuperAdmin` > `Admin` > `Operator` > `Viewer`.
   - `authorizeRoles(...)` & `authorizeMinRole(...)` restrict API endpoints based on privilege levels.

3. **Strict Resource Isolation**: `server/middleware/rbac.js` -> `tenantIsolationVerification()`
   - Verifies resource ownership by matching `tenant_id` on all CRUD operations.

## Cloud Provider Credentials Requirements

| Provider | Required Environment / Config Variables | Failure Behavior when Credentials Missing |
|----------|-----------------------------------------|------------------------------------------|
| **Azure** | `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | `AzureDeploymentProvider.deploy()` throws `"Azure Credentials Missing: Connect Azure Subscription..."` — fails deployment immediately with zero simulated fallbacks. |
| **AWS** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (or `AWS_ROLE_ARN`) | `AwsDeploymentProvider.deploy()` throws `"AWS credentials not configured: missing AWS_ACCESS_KEY_ID or AWS_ROLE_ARN."` |
| **GCP** | `GCP_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` (or `GCP_SERVICE_ACCOUNT_JSON`) | `GcpDeploymentProvider.deploy()` throws `"GCP credentials not configured: missing GCP_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS."` |

---

## Test Verification

Verified by `server/test_type_specific_workflows.js`, `test_real_deployment_providers.js`, and `test-suite/negative-tests/NT-3-false-success.cjs`.
