-- ============================================================
-- CloudOps Enterprise SaaS - Database Schema (SQLite)
-- ============================================================

-- Enable foreign keys support
PRAGMA foreign_keys = ON;

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 1.5. Roles and Permissions
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    action TEXT NOT NULL,
    allowed INTEGER DEFAULT 1,
    FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(role_id, action)
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    display_name TEXT,
    role TEXT CHECK(role IN ('SuperAdmin', 'Admin', 'Operator', 'Reader', 'User', 'Viewer')) NOT NULL DEFAULT 'Viewer',
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'Microsoft',
    last_login DATETIME,
    status TEXT CHECK(status IN ('Approved', 'Pending Approval', 'Disabled')) NOT NULL DEFAULT 'Approved',
    auth_provider TEXT DEFAULT 'Local',
    password_hash TEXT,
    mfa_enabled INTEGER DEFAULT 0,
    onboarding_complete BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Login History tracking
CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL, -- 'Success', 'Failed'
    reason TEXT,
    mfa_status TEXT, -- 'Verified', 'Skipped', 'Failed'
    location_flagged INTEGER DEFAULT 0
);

-- Active Sessions tracking
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    provider TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Failed Logins tracking for Security Dashboard
CREATE TABLE IF NOT EXISTS failed_logins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip_address TEXT,
    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- 3. Azure Subscriptions Table
CREATE TABLE IF NOT EXISTS azure_subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    name TEXT NOT NULL,
    client_id TEXT,
    client_secret TEXT,
    azure_tenant_id TEXT,
    auth_type TEXT CHECK(auth_type IN ('MSAL', 'CREDENTIALS')) NOT NULL DEFAULT 'MSAL',
    status TEXT NOT NULL DEFAULT 'Active',
    active_resource_group TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 3.5. Multi-Cloud Accounts Table
CREATE TABLE IF NOT EXISTS cloud_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    provider TEXT NOT NULL,
    account_name TEXT NOT NULL,
    subscription_id TEXT,
    account_id TEXT,
    region TEXT,
    role_arn TEXT,
    external_id TEXT,
    access_key_id TEXT,
    secret_access_key TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    last_sync DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 4. Discovered Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY, -- Fully qualified Azure Resource ID
    subscription_id TEXT NOT NULL,
    tenant_id TEXT,
    user_id TEXT,
    provider TEXT DEFAULT 'Azure',
    resource_group TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Running',
    tags TEXT, -- JSON String
    raw_payload TEXT, -- JSON String
    last_discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    owner TEXT,
    last_modified TEXT,
    cost_impact REAL DEFAULT 0,
    cost_monthly REAL DEFAULT 0,
    risk_score REAL DEFAULT 0,
    health_status TEXT DEFAULT 'Healthy',
    cloud_account_id TEXT,
    account_id TEXT,
    region TEXT,
    organization_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    provider TEXT NOT NULL DEFAULT 'Azure',
    subscription_id TEXT NOT NULL,
    resource_id TEXT,
    title TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('CRITICAL', 'WARNING', 'INFORMATIONAL', 'SEV0', 'SEV1', 'SEV2', 'SEV3')) NOT NULL,
    status TEXT CHECK(status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CLOSED', 'NEW', 'IN_PROGRESS')) NOT NULL DEFAULT 'ACTIVE',
    category TEXT CHECK(category IN ('Security', 'Performance', 'Cost', 'Backup', 'Governance', 'Availability')) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    assigned_team TEXT,
    resolution_progress INTEGER DEFAULT 0,
    root_cause TEXT,
    postmortem TEXT,
    escalation_level INTEGER DEFAULT 0
);

-- 9. Resource Changes Table (Drift tracking)
CREATE TABLE IF NOT EXISTS resource_changes (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    change_type TEXT NOT NULL, -- e.g. Create, Update, Delete
    timestamp TEXT,
    changed_properties TEXT, -- JSON Array of changed properties
    FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- 10. Governance Findings Table
CREATE TABLE IF NOT EXISTS governance_findings (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g. PolicyViolation, TagCompliance, NamingStandard, ResourceLock
    severity TEXT NOT NULL, -- e.g. Critical, High, Medium, Low
    details TEXT, -- JSON string or description
    recommendation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
);


-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    provider TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT, -- JSON String
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Admin Audit Logs Table per user request
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('incident', 'cost', 'system', 'security')) NOT NULL,
    read INTEGER DEFAULT 0, -- 0 = Unread, 1 = Read
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 8. Cost Budgets Table
CREATE TABLE IF NOT EXISTS cost_budgets (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    user_id TEXT,
    amount REAL NOT NULL,
    time_grain TEXT CHECK(time_grain IN ('MONTHLY', 'QUARTERLY', 'YEARLY')) NOT NULL DEFAULT 'MONTHLY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Operations Table
CREATE TABLE IF NOT EXISTS operations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stage TEXT NOT NULL,
    percent INTEGER DEFAULT 0,
    time_remaining TEXT,
    status TEXT CHECK(status IN ('Pending', 'Running', 'Succeeded', 'Failed')) NOT NULL DEFAULT 'Pending',
    user_email TEXT NOT NULL,
    user_id TEXT,
    tenant_id TEXT,
    cloud_account_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY(cloud_account_id) REFERENCES cloud_accounts(id) ON DELETE CASCADE
);

-- 12. Operation Logs Table
CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- 13. Privileged Actions Table
CREATE TABLE IF NOT EXISTS privileged_actions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    reason TEXT,
    status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
    approver_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 14. Tenant Billing Table (SaaS Commercialization)
CREATE TABLE IF NOT EXISTS tenant_billing (
    tenant_id TEXT PRIMARY KEY,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_tier TEXT CHECK(plan_tier IN ('Starter', 'Professional', 'Enterprise')) DEFAULT 'Starter',
    status TEXT CHECK(status IN ('Active', 'PastDue', 'Canceled', 'Trialing')) DEFAULT 'Trialing',
    trial_ends_at DATETIME,
    current_period_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 15. Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 0,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, feature_name)
);

-- 16. AI Optimizations Table
CREATE TABLE IF NOT EXISTS ai_optimizations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    category TEXT NOT NULL,
    current_sku TEXT NOT NULL,
    recommended_sku TEXT NOT NULL,
    estimated_savings REAL DEFAULT 0,
    confidence_score REAL DEFAULT 0,
    reason TEXT,
    root_cause TEXT,
    status TEXT CHECK(status IN ('Active', 'Applied', 'Dismissed')) NOT NULL DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 17. Multi-Cloud Performance History Table
CREATE TABLE IF NOT EXISTS cloud_performance_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL DEFAULT 0,
    metric_score REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 18. Cloud Usage History Table
CREATE TABLE IF NOT EXISTS cloud_usage_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    resource_id TEXT,
    cost REAL DEFAULT 0,
    cpu_usage REAL DEFAULT 0,
    memory_usage REAL DEFAULT 0,
    storage_growth REAL DEFAULT 0,
    bandwidth REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 19. Predictive Alerts Table
CREATE TABLE IF NOT EXISTS predictive_alerts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    anomaly_score REAL DEFAULT 0,
    expected_value REAL DEFAULT 0,
    actual_value REAL DEFAULT 0,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 20. Cloud Migration Recommendations Table
CREATE TABLE IF NOT EXISTS migration_recommendations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    source_provider TEXT NOT NULL,
    target_provider TEXT NOT NULL,
    cpu INTEGER DEFAULT 0,
    memory INTEGER DEFAULT 0,
    storage INTEGER DEFAULT 0,
    source_price REAL DEFAULT 0,
    target_price REAL DEFAULT 0,
    migration_cost REAL DEFAULT 0,
    migration_risk INTEGER DEFAULT 0,
    estimated_savings REAL DEFAULT 0,
    performance_improvement INTEGER DEFAULT 0,
    downtime REAL DEFAULT 0,
    confidence_score INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('Active', 'Simulating', 'Migrated')) NOT NULL DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 21. Enterprise FinOps Cost Breakdown Table
CREATE TABLE IF NOT EXISTS finops_cost_breakdown (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    service_name TEXT NOT NULL,
    department TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    cost_amount REAL DEFAULT 0,
    is_idle INTEGER DEFAULT 0,
    is_unused_volume INTEGER DEFAULT 0,
    is_unused_ip INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 22. Enterprise FinOps Budget Alerts Table
CREATE TABLE IF NOT EXISTS finops_budget_alerts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    budget_name TEXT NOT NULL,
    limit_amount REAL DEFAULT 0,
    current_spend REAL DEFAULT 0,
    triggered_percentage REAL DEFAULT 0,
    status TEXT CHECK(status IN ('Active', 'Resolved')) NOT NULL DEFAULT 'Active',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 23. ISO 27017 Compliance Policies Table
CREATE TABLE IF NOT EXISTS compliance_policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    category TEXT CHECK(category IN ('Encryption', 'IAM', 'MFA', 'Logging', 'Backup', 'Monitoring', 'Tagging', 'Network', 'Storage')) NOT NULL,
    status TEXT CHECK(status IN ('Compliant', 'Non-Compliant')) NOT NULL DEFAULT 'Non-Compliant',
    severity TEXT CHECK(severity IN ('Critical', 'High', 'Medium', 'Low')) NOT NULL DEFAULT 'Medium',
    remediation_steps TEXT,
    resource_id TEXT,
    resource_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 24. Optimization Scores Table
CREATE TABLE IF NOT EXISTS optimization_scores (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    performance_score INTEGER DEFAULT 80,
    cost_score INTEGER DEFAULT 80,
    security_score INTEGER DEFAULT 80,
    compliance_score INTEGER DEFAULT 80,
    availability_score INTEGER DEFAULT 80,
    backup_score INTEGER DEFAULT 80,
    governance_score INTEGER DEFAULT 80,
    overall_score INTEGER DEFAULT 80,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);






-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cloud_accounts_tenant ON cloud_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_sub ON resources(subscription_id);
CREATE INDEX IF NOT EXISTS idx_resources_tenant_provider ON resources(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_incidents_sub ON incidents(subscription_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);

-- ============================================================
-- CLOUD-223: Multi-Cloud Application Platform Abstraction Tables
-- ============================================================


-- 25. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0.0',
    container_image TEXT NOT NULL,
    repository_url TEXT,
    env_vars TEXT, -- JSON Object key-value pairs
    cloud_targets TEXT NOT NULL, -- JSON Array e.g. ["azure", "aws", "gcp"]
    deployment_type TEXT DEFAULT 'Docker',
    deployment_strategy TEXT DEFAULT 'Rolling',
    owner TEXT,
    tags TEXT, -- JSON Array or Object
    health_status TEXT DEFAULT 'Healthy',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);


-- 26. Deployments Table
CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    target_cloud TEXT CHECK(target_cloud IN ('azure', 'aws', 'gcp', 'Azure', 'AWS', 'GCP')) NOT NULL,
    deployment_type TEXT DEFAULT 'Docker',
    version TEXT DEFAULT '1.0.0',
    status TEXT CHECK(status IN ('Queued', 'Running', 'Completed', 'Failed', 'Rollback', 'Restarted', 'Terminated', 'Paused')) NOT NULL DEFAULT 'Queued',
    trigger_type TEXT DEFAULT 'Manual',
    endpoint_url TEXT,
    resource_id TEXT,
    duration_ms INTEGER DEFAULT 0,
    error_message TEXT,
    deployed_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 27. Deployment Logs Table
CREATE TABLE IF NOT EXISTS deployment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT CHECK(level IN ('INFO', 'WARN', 'ERROR', 'SUCCESS')) DEFAULT 'INFO',
    step TEXT,
    message TEXT NOT NULL,
    FOREIGN KEY(deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

-- 28. Deployment Metrics Table
CREATE TABLE IF NOT EXISTS deployment_metrics (
    id TEXT PRIMARY KEY,
    deployment_id TEXT NOT NULL,
    target_cloud TEXT NOT NULL,
    cpu_usage_avg REAL DEFAULT 0,
    memory_mb_avg REAL DEFAULT 0,
    latency_ms REAL DEFAULT 0,
    storage_read_mbps REAL DEFAULT 0,
    container_startup_sec REAL DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

-- 29. Provider Scores Table
CREATE TABLE IF NOT EXISTS provider_scores (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    performance_score REAL DEFAULT 85.0,
    cost_efficiency_score REAL DEFAULT 80.0,
    reliability_score REAL DEFAULT 90.0,
    portability_score REAL DEFAULT 88.0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 30. Portability Scores Table
CREATE TABLE IF NOT EXISTS portability_scores (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    portability_score REAL DEFAULT 85.0,
    compatibility_score REAL DEFAULT 90.0,
    performance_score REAL DEFAULT 88.0,
    consistency_score REAL DEFAULT 92.0,
    evaluated_clouds TEXT, -- JSON Array e.g. ["azure", "aws", "gcp"]
    drift_details TEXT, -- JSON String
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 31. Comparison Results Table
CREATE TABLE IF NOT EXISTS comparison_results (
    id TEXT PRIMARY KEY,
    application_id TEXT,
    tenant_id TEXT NOT NULL,
    metric_category TEXT NOT NULL, -- CPU, Memory, Storage, Latency, Cost, Availability, Network, StartupTime, ScalingTime
    azure_value REAL DEFAULT 0,
    aws_value REAL DEFAULT 0,
    gcp_value REAL DEFAULT 0,
    winner TEXT DEFAULT 'Azure',
    unit TEXT,
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 32. Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    application_id TEXT,
    tenant_id TEXT NOT NULL,
    recommended_cloud TEXT NOT NULL,
    title TEXT NOT NULL,
    rationale TEXT NOT NULL,
    cost_savings_pct REAL DEFAULT 0,
    performance_gain_pct REAL DEFAULT 0,
    availability_target REAL DEFAULT 99.99,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 33. Recovery Results Table
CREATE TABLE IF NOT EXISTS recovery_results (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    recovery_time_sec REAL DEFAULT 0,
    recovery_success_rate REAL DEFAULT 99.9,
    failover_time_sec REAL DEFAULT 0,
    restore_time_sec REAL DEFAULT 0,
    backup_health_score REAL DEFAULT 95.0,
    overall_recovery_score REAL DEFAULT 92.0,
    tested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 34. Application Health Table
CREATE TABLE IF NOT EXISTS application_health (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    cpu_percent REAL DEFAULT 0,
    memory_percent REAL DEFAULT 0,
    network_kbps REAL DEFAULT 0,
    disk_usage_percent REAL DEFAULT 0,
    request_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    availability_percent REAL DEFAULT 100.0,
    response_time_ms REAL DEFAULT 0,
    container_status TEXT DEFAULT 'Running',
    restart_count INTEGER DEFAULT 0,
    pod_status TEXT DEFAULT 'Ready',
    node_status TEXT DEFAULT 'Ready',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- 35. Provider Credentials Table
CREATE TABLE IF NOT EXISTS provider_credentials (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT CHECK(provider IN ('azure', 'aws', 'gcp', 'kubernetes', 'docker')) NOT NULL,
    credential_name TEXT NOT NULL,
    auth_type TEXT NOT NULL, -- e.g. ServicePrincipal, IAMRole, ServiceAccountKey, KubeConfig
    encrypted_data TEXT NOT NULL,
    status TEXT DEFAULT 'Configured', -- 'Configured', 'Not Configured', 'Invalid'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 36. Regions Catalog Table
CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    available_zones INTEGER DEFAULT 3,
    is_active INTEGER DEFAULT 1
);

-- 37. Instance Types Catalog Table
CREATE TABLE IF NOT EXISTS instance_types (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    vcpu INTEGER NOT NULL,
    memory_mb INTEGER NOT NULL,
    architecture TEXT DEFAULT 'x86_64',
    category TEXT DEFAULT 'General Purpose'
);

-- 38. Environment Variables Table
CREATE TABLE IF NOT EXISTS environment_variables (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    environment TEXT DEFAULT 'production', -- 'development', 'testing', 'staging', 'production'
    key_name TEXT NOT NULL,
    value TEXT,
    is_secret INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- 39. Secrets Metadata Table
CREATE TABLE IF NOT EXISTS secrets_metadata (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'azure_keyvault', 'aws_secretsmanager', 'gcp_secretmanager'
    secret_name TEXT NOT NULL,
    secret_uri TEXT,
    version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- 40. Autoscaling Configuration Table
CREATE TABLE IF NOT EXISTS autoscaling (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    min_instances INTEGER DEFAULT 1,
    max_instances INTEGER DEFAULT 10,
    cpu_threshold_percent REAL DEFAULT 80.0,
    memory_threshold_percent REAL DEFAULT 80.0,
    request_threshold_per_sec INTEGER DEFAULT 1000,
    enabled INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- 41. Costs Table
CREATE TABLE IF NOT EXISTS costs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    application_id TEXT,
    provider TEXT NOT NULL,
    service_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 42. Project Analyses Table
CREATE TABLE IF NOT EXISTS project_analyses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    project_path TEXT NOT NULL,
    framework TEXT NOT NULL,
    language TEXT NOT NULL,
    runtime TEXT NOT NULL,
    build_command TEXT,
    start_command TEXT,
    container_type TEXT DEFAULT 'Docker',
    deployment_strategy TEXT DEFAULT 'Rolling',
    detected_files TEXT, -- JSON Array
    has_dockerfile INTEGER DEFAULT 0,
    has_compose INTEGER DEFAULT 0,
    has_k8s INTEGER DEFAULT 0,
    has_helm INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 43. Environment Configurations Table
CREATE TABLE IF NOT EXISTS env_configurations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    value TEXT,
    is_required INTEGER DEFAULT 1,
    description TEXT,
    example_value TEXT,
    how_to_create TEXT,
    doc_link TEXT,
    status TEXT CHECK(status IN ('VALID', 'MISSING', 'OPTIONAL')) DEFAULT 'VALID',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, key_name)
);

-- 44. Tool Verifications Table
CREATE TABLE IF NOT EXISTS tool_verifications (
    id TEXT PRIMARY KEY,
    tool_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('INSTALLED', 'MISSING', 'ERROR')) NOT NULL,
    version TEXT,
    binary_path TEXT,
    download_url TEXT,
    install_command TEXT,
    verification_command TEXT,
    last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_tenant ON applications(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_app_tenant ON deployments(application_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_dep ON deployment_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_project_analyses_tenant ON project_analyses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_env_config_tenant ON env_configurations(tenant_id, key_name);

-- 45. Provider Credentials Table
CREATE TABLE IF NOT EXISTS provider_credentials (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    credential_type TEXT DEFAULT 'API_KEY',
    credentials_data TEXT,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 46. Metrics View / Table
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    deployment_id TEXT,
    tenant_id TEXT,
    metric_name TEXT NOT NULL,
    metric_value REAL DEFAULT 0,
    unit TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 47. Evidence Runs Table (CLOUD-223 Capstone Audit Trail)
-- Every evidence file produced by deployment, chaos, diff, or acceptance runs
-- is registered here with its SHA256 hash, provenance, and partition.
CREATE TABLE IF NOT EXISTS evidence_runs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    run_type TEXT NOT NULL CHECK(run_type IN ('deployment', 'chaos', 'diff', 'ablation', 'sensitivity', 'acceptance', 'integration', 'negative-test')),
    provider TEXT,
    partition TEXT NOT NULL CHECK(partition IN ('dev', 'acceptance')),
    file_path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    generated_by TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT  -- JSON: additional context (experiment type, workload, resource budget, etc.)
);

CREATE INDEX IF NOT EXISTS idx_evidence_runs_type ON evidence_runs(run_type, partition);
CREATE INDEX IF NOT EXISTS idx_evidence_runs_run ON evidence_runs(run_id);




