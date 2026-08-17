# Database Schema Specification

## Overview
The CloudOps database schema is designed for multi-tenant isolation, application catalog management, deployment tracking, security auditing, and FinOps cost accounting.

---

## Core Entity Tables

### 1. `tenants`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique tenant identifier |
| `name` | TEXT | NOT NULL | Organization name |
| `status` | TEXT | DEFAULT 'Active' | Account status |

### 2. `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | User ID |
| `email` | TEXT | UNIQUE, NOT NULL | User login email |
| `role` | TEXT | NOT NULL | Role (`SuperAdmin`, `Admin`, `Operator`, `Viewer`) |
| `tenant_id` | TEXT | FOREIGN KEY | Parent tenant ID |

### 3. `applications`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Application ID |
| `tenant_id` | TEXT | FOREIGN KEY | Owner tenant ID |
| `name` | TEXT | NOT NULL | Application name |
| `container_image` | TEXT | NOT NULL | Registry image URI |
| `deployment_type` | TEXT | DEFAULT 'Docker' | Deployment category |

### 4. `deployments`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Deployment ID |
| `application_id` | TEXT | FOREIGN KEY | Target application ID |
| `target_cloud` | TEXT | NOT NULL | Target cloud (`azure`, `aws`, `gcp`) |
| `status` | TEXT | NOT NULL | Status (`Queued`, `Running`, `Completed`, `Failed`, `Rollback`, `Paused`) |
| `duration_ms` | INTEGER | DEFAULT 0 | Deployment duration in milliseconds |

### 5. `deployment_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Log entry ID |
| `deployment_id` | TEXT | FOREIGN KEY | Associated deployment ID |
| `level` | TEXT | DEFAULT 'INFO' | Log level (`INFO`, `WARN`, `ERROR`, `SUCCESS`) |
| `step` | TEXT | | Pipeline execution step |
| `message` | TEXT | NOT NULL | Step log message |

### 6. `deployment_metrics`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Metric record ID |
| `deployment_id` | TEXT | FOREIGN KEY | Associated deployment ID |
| `cpu_usage_avg` | REAL | | Average CPU percentage |
| `memory_mb_avg` | REAL | | Average Memory in MB |
| `latency_ms` | REAL | | Average response latency in ms |

### 7. `provider_credentials`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Credential ID |
| `tenant_id` | TEXT | FOREIGN KEY | Tenant ID |
| `provider` | TEXT | NOT NULL | Cloud provider (`azure`, `aws`, `gcp`, `kubernetes`) |
| `encrypted_data` | TEXT | NOT NULL | Encrypted credential metadata |

### 8. `autoscaling`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Scaling rule ID |
| `application_id` | TEXT | FOREIGN KEY | Target application ID |
| `min_instances` | INTEGER | DEFAULT 1 | Minimum replica count |
| `max_instances` | INTEGER | DEFAULT 10 | Maximum replica count |
| `cpu_threshold_percent` | REAL | DEFAULT 80.0 | CPU scaling threshold |

### 9. `audit_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Audit log ID |
| `tenant_id` | TEXT | FOREIGN KEY | Tenant ID |
| `user_id` | TEXT | | User who performed action |
| `action` | TEXT | NOT NULL | Action performed |
| `details` | TEXT | | Action details / payload |
