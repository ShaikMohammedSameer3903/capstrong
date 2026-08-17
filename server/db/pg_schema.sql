-- ============================================================
-- CloudOps Enterprise SaaS - Database Schema (PostgreSQL)
-- ============================================================

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1.5. Roles and Permissions
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    allowed INTEGER DEFAULT 1,
    UNIQUE(role_id, action)
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name VARCHAR(255),
    display_name TEXT,
    role TEXT CHECK(role IN ('SuperAdmin', 'Admin', 'Operator', 'Reader', 'User', 'Viewer')) NOT NULL DEFAULT 'Viewer',
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'Microsoft',
    last_login TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK(status IN ('Approved', 'Pending Approval', 'Disabled')) NOT NULL DEFAULT 'Approved',
    auth_provider VARCHAR(50) DEFAULT 'Local',
    password_hash TEXT,
    mfa_enabled INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login History tracking
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL,
    reason TEXT,
    mfa_status TEXT,
    location_flagged INTEGER DEFAULT 0
);

-- Active Sessions tracking
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    provider TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked INTEGER DEFAULT 0
);

-- Failed Logins tracking for Security Dashboard
CREATE TABLE IF NOT EXISTS failed_logins (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- 3. Azure Subscriptions Table
CREATE TABLE IF NOT EXISTS azure_subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id TEXT NOT NULL,
    name TEXT NOT NULL,
    client_id TEXT,
    client_secret TEXT,
    azure_tenant_id TEXT,
    auth_type TEXT CHECK(auth_type IN ('MSAL', 'CREDENTIALS')) NOT NULL DEFAULT 'MSAL',
    status TEXT NOT NULL DEFAULT 'Active',
    active_resource_group TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5. Multi-Cloud Accounts Table
CREATE TABLE IF NOT EXISTS cloud_accounts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Discovered Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    resource_group TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Running',
    tags TEXT,
    raw_payload TEXT,
    last_discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner TEXT,
    last_modified TEXT,
    cost_impact NUMERIC DEFAULT 0,
    risk_score NUMERIC DEFAULT 0,
    health_status TEXT DEFAULT 'Healthy'
);

-- Indexes for resources table
CREATE INDEX IF NOT EXISTS idx_resources_sub ON resources(subscription_id);

-- 5. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    resource_id TEXT,
    title TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('CRITICAL', 'WARNING', 'INFORMATIONAL', 'SEV0', 'SEV1', 'SEV2', 'SEV3')) NOT NULL,
    status TEXT CHECK(status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CLOSED', 'NEW', 'IN_PROGRESS')) NOT NULL DEFAULT 'ACTIVE',
    category TEXT CHECK(category IN ('Security', 'Performance', 'Cost', 'Backup', 'Governance', 'Availability')) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    assigned_team TEXT,
    resolution_progress INTEGER DEFAULT 0,
    root_cause TEXT,
    postmortem TEXT,
    escalation_level INTEGER DEFAULT 0
);

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('incident', 'cost', 'system', 'security', 'NOTIFICATION')) NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Cost Budgets Table
CREATE TABLE IF NOT EXISTS cost_budgets (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    time_grain TEXT CHECK(time_grain IN ('MONTHLY', 'QUARTERLY', 'YEARLY')) NOT NULL DEFAULT 'MONTHLY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Resource Changes Table
CREATE TABLE IF NOT EXISTS resource_changes (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    timestamp TEXT,
    changed_properties TEXT
);

-- 10. Governance Findings Table
CREATE TABLE IF NOT EXISTS governance_findings (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    details TEXT,
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Operation Logs Table
CREATE TABLE IF NOT EXISTS operation_logs (
    id SERIAL PRIMARY KEY,
    operation_id TEXT NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Privileged Actions Table
CREATE TABLE IF NOT EXISTS privileged_actions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requester_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    reason TEXT,
    status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
    approver_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 14. Tenant Billing Table (SaaS Commercialization)
CREATE TABLE IF NOT EXISTS tenant_billing (
    tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_tier TEXT CHECK(plan_tier IN ('Starter', 'Professional', 'Enterprise')) DEFAULT 'Starter',
    status TEXT CHECK(status IN ('Active', 'PastDue', 'Canceled', 'Trialing')) DEFAULT 'Trialing',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 0,
    UNIQUE(tenant_id, feature_name)
);

-- 16. AI Optimizations Table
CREATE TABLE IF NOT EXISTS ai_optimizations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    category TEXT NOT NULL,
    current_sku TEXT NOT NULL,
    recommended_sku TEXT NOT NULL,
    estimated_savings NUMERIC DEFAULT 0,
    confidence_score NUMERIC DEFAULT 0,
    reason TEXT,
    root_cause TEXT,
    status TEXT CHECK(status IN ('Active', 'Applied', 'Dismissed')) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Multi-Cloud Performance History Table
CREATE TABLE IF NOT EXISTS cloud_performance_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC DEFAULT 0,
    metric_score NUMERIC DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Cloud Usage History Table
CREATE TABLE IF NOT EXISTS cloud_usage_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    resource_id TEXT,
    cost NUMERIC DEFAULT 0,
    cpu_usage NUMERIC DEFAULT 0,
    memory_usage NUMERIC DEFAULT 0,
    storage_growth NUMERIC DEFAULT 0,
    bandwidth NUMERIC DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Predictive Alerts Table
CREATE TABLE IF NOT EXISTS predictive_alerts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    anomaly_score NUMERIC DEFAULT 0,
    expected_value NUMERIC DEFAULT 0,
    actual_value NUMERIC DEFAULT 0,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Cloud Migration Recommendations Table
CREATE TABLE IF NOT EXISTS migration_recommendations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    source_provider TEXT NOT NULL,
    target_provider TEXT NOT NULL,
    cpu INTEGER DEFAULT 0,
    memory INTEGER DEFAULT 0,
    storage INTEGER DEFAULT 0,
    source_price NUMERIC DEFAULT 0,
    target_price NUMERIC DEFAULT 0,
    migration_cost NUMERIC DEFAULT 0,
    migration_risk INTEGER DEFAULT 0,
    estimated_savings NUMERIC DEFAULT 0,
    performance_improvement INTEGER DEFAULT 0,
    downtime NUMERIC DEFAULT 0,
    confidence_score INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('Active', 'Simulating', 'Migrated')) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Enterprise FinOps Cost Breakdown Table
CREATE TABLE IF NOT EXISTS finops_cost_breakdown (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    service_name TEXT NOT NULL,
    department TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    cost_amount NUMERIC DEFAULT 0,
    is_idle INTEGER DEFAULT 0,
    is_unused_volume INTEGER DEFAULT 0,
    is_unused_ip INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Enterprise FinOps Budget Alerts Table
CREATE TABLE IF NOT EXISTS finops_budget_alerts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    budget_name TEXT NOT NULL,
    limit_amount NUMERIC DEFAULT 0,
    current_spend NUMERIC DEFAULT 0,
    triggered_percentage NUMERIC DEFAULT 0,
    status TEXT CHECK(status IN ('Active', 'Resolved')) NOT NULL DEFAULT 'Active',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. ISO 27017 Compliance Policies Table
CREATE TABLE IF NOT EXISTS compliance_policies (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    category TEXT CHECK(category IN ('Encryption', 'IAM', 'MFA', 'Logging', 'Backup', 'Monitoring', 'Tagging', 'Network', 'Storage')) NOT NULL,
    status TEXT CHECK(status IN ('Compliant', 'Non-Compliant')) NOT NULL DEFAULT 'Non-Compliant',
    severity TEXT CHECK(severity IN ('Critical', 'High', 'Medium', 'Low')) NOT NULL DEFAULT 'Medium',
    remediation_steps TEXT,
    resource_id TEXT,
    resource_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Optimization Scores Table
CREATE TABLE IF NOT EXISTS optimization_scores (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    performance_score INTEGER DEFAULT 80,
    cost_score INTEGER DEFAULT 80,
    security_score INTEGER DEFAULT 80,
    compliance_score INTEGER DEFAULT 80,
    availability_score INTEGER DEFAULT 80,
    backup_score INTEGER DEFAULT 80,
    governance_score INTEGER DEFAULT 80,
    overall_score INTEGER DEFAULT 80,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. Provider Credentials Table
CREATE TABLE IF NOT EXISTS provider_credentials (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT CHECK(provider IN ('azure', 'aws', 'gcp', 'kubernetes', 'docker')) NOT NULL,
    credential_name TEXT NOT NULL,
    auth_type TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    status TEXT DEFAULT 'Configured',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 26. Regions Catalog Table
CREATE TABLE IF NOT EXISTS regions (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    available_zones INTEGER DEFAULT 3,
    is_active INTEGER DEFAULT 1
);

-- 27. Instance Types Catalog Table
CREATE TABLE IF NOT EXISTS instance_types (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    vcpu INTEGER NOT NULL,
    memory_mb INTEGER NOT NULL,
    architecture TEXT DEFAULT 'x86_64',
    category TEXT DEFAULT 'General Purpose'
);

-- 28. Environment Variables Table
CREATE TABLE IF NOT EXISTS environment_variables (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    environment TEXT DEFAULT 'production',
    key_name TEXT NOT NULL,
    value TEXT,
    is_secret INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 29. Secrets Metadata Table
CREATE TABLE IF NOT EXISTS secrets_metadata (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    secret_name TEXT NOT NULL,
    secret_uri TEXT,
    version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 30. Autoscaling Configuration Table
CREATE TABLE IF NOT EXISTS autoscaling (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    min_instances INTEGER DEFAULT 1,
    max_instances INTEGER DEFAULT 10,
    cpu_threshold_percent NUMERIC DEFAULT 80.0,
    memory_threshold_percent NUMERIC DEFAULT 80.0,
    request_threshold_per_sec INTEGER DEFAULT 1000,
    enabled INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 31. Costs Table
CREATE TABLE IF NOT EXISTS costs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    application_id TEXT,
    provider TEXT NOT NULL,
    service_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cloud_accounts_tenant ON cloud_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_sub ON resources(subscription_id);
CREATE INDEX IF NOT EXISTS idx_incidents_sub ON incidents(subscription_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);

-- 32. Metrics Table
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    deployment_id TEXT,
    tenant_id TEXT,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC DEFAULT 0,
    unit TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


