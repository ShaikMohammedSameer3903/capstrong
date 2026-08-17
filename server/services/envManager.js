const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../db/database');

const REQUIRED_ENV_VARS = [
  {
    key: 'PORT',
    description: 'HTTP server listening port for backend application',
    example: '3001',
    howToCreate: 'Set port number in environment or .env file',
    docLink: 'https://nodejs.org/api/process.html#processenv',
    defaultValue: '3001',
    isSecret: false
  },
  {
    key: 'DATABASE_URL',
    description: 'PostgreSQL or SQLite connection URI string',
    example: 'postgresql://user:password@localhost:5432/cloudops',
    howToCreate: 'Provision PostgreSQL instance or set DATABASE_PATH for SQLite fallback',
    docLink: 'https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING',
    defaultValue: '',
    isSecret: true
  },
  {
    key: 'JWT_SECRET',
    description: 'Cryptographic key used to sign and verify JWT authentication tokens',
    example: 'super-secret-jwt-signing-key-32-chars-minimum',
    howToCreate: 'Generate using openssl rand -base64 32',
    docLink: 'https://jwt.io/introduction',
    defaultValue: 'cloudops-enterprise-jwt-super-secret-key-2026',
    isSecret: true
  },
  {
    key: 'JWT_EXPIRE',
    description: 'JSON Web Token validity duration',
    example: '24h',
    howToCreate: 'Specify duration format (e.g., 1h, 24h, 7d)',
    docLink: 'https://github.com/auth0/node-jsonwebtoken',
    defaultValue: '24h',
    isSecret: false
  },
  {
    key: 'AZURE_CLIENT_ID',
    description: 'Azure Active Directory Service Principal Client Application ID',
    example: '00000000-0000-0000-0000-000000000000',
    howToCreate: 'Create via Azure CLI: az ad sp create-for-rbac --name CloudOpsApp',
    docLink: 'https://learn.microsoft.com/en-us/azure/developer/javascript/sdk/authentication-overview',
    defaultValue: '',
    isSecret: false
  },
  {
    key: 'AZURE_CLIENT_SECRET',
    description: 'Azure Active Directory Service Principal Secret Key',
    example: 'wXyZ~1234567890abcdef...',
    howToCreate: 'Generate client secret in Microsoft Entra App Registrations portal',
    docLink: 'https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app',
    defaultValue: '',
    isSecret: true
  },
  {
    key: 'AZURE_TENANT_ID',
    description: 'Microsoft Entra Organization Tenant Directory ID',
    example: '11111111-1111-1111-1111-111111111111',
    howToCreate: 'Find Tenant ID in Microsoft Azure Portal -> Entra ID -> Overview',
    docLink: 'https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/active-directory-how-to-find-tenant',
    defaultValue: '',
    isSecret: false
  },
  {
    key: 'AZURE_SUBSCRIPTION_ID',
    description: 'Azure Cloud Subscription Identifier for Resource Management',
    example: '22222222-2222-2222-2222-222222222222',
    howToCreate: 'Run az account list in Azure CLI or check Azure Portal subscriptions',
    docLink: 'https://learn.microsoft.com/en-us/azure/azure-portal/get-subscription-tenant-id',
    defaultValue: '',
    isSecret: false
  },
  {
    key: 'AWS_ACCESS_KEY_ID',
    description: 'Amazon Web Services IAM User Access Key ID',
    example: 'AKIAIOSFODNN7EXAMPLE',
    howToCreate: 'Generate in AWS IAM Console -> Users -> Security Credentials',
    docLink: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
    defaultValue: '',
    isSecret: false
  },
  {
    key: 'AWS_SECRET_ACCESS_KEY',
    description: 'Amazon Web Services IAM User Secret Access Key',
    example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    howToCreate: 'Saved during IAM Access Key generation in AWS',
    docLink: 'https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html',
    defaultValue: '',
    isSecret: true
  },
  {
    key: 'AWS_REGION',
    description: 'Primary Amazon Web Services Deployment Region',
    example: 'us-east-1',
    howToCreate: 'Specify target region code (e.g., us-east-1, eu-west-1, ap-south-1)',
    docLink: 'https://docs.aws.amazon.com/general/latest/gr/rande.html',
    defaultValue: 'us-east-1',
    isSecret: false
  },
  {
    key: 'GCP_PROJECT_ID',
    description: 'Google Cloud Platform Project Identifier',
    example: 'cloudops-prod-project',
    howToCreate: 'Create Project in Google Cloud Console or via gcloud projects create',
    docLink: 'https://cloud.google.com/resource-manager/docs/creating-managing-projects',
    defaultValue: '',
    isSecret: false
  },
  {
    key: 'GCP_SERVICE_ACCOUNT_JSON',
    description: 'Base64 string or JSON path for GCP Service Account Credentials',
    example: '/path/to/gcp-sa-key.json',
    howToCreate: 'Generate Key in GCP IAM & Admin -> Service Accounts -> Keys',
    docLink: 'https://cloud.google.com/iam/docs/keys-create-delete',
    defaultValue: '',
    isSecret: true
  },
  {
    key: 'DOCKER_REGISTRY',
    description: 'Container Image Registry URL (ACR, ECR, GAR, Docker Hub, GHCR)',
    example: 'myregistry.azurecr.io',
    howToCreate: 'Provision Azure Container Registry, AWS ECR, or GitHub Container Registry',
    docLink: 'https://docs.docker.com/docker-hub/repos/official-repositories/',
    defaultValue: 'docker.io',
    isSecret: false
  },
  {
    key: 'REDIS_URL',
    description: 'Redis Cache connection URI string',
    example: 'redis://:password@localhost:6379',
    howToCreate: 'Provision Redis server or Azure Cache for Redis',
    docLink: 'https://redis.io/docs/connect/clients/',
    defaultValue: '',
    isSecret: true
  },
  {
    key: 'PROMETHEUS_URL',
    description: 'Prometheus Telemetry Server Endpoint URL',
    example: 'http://prometheus:9090',
    howToCreate: 'Deploy Prometheus server or Managed Prometheus instance',
    docLink: 'https://prometheus.io/docs/prometheus/latest/getting_started/',
    defaultValue: '',
    isSecret: false
  },
  {
    key: 'GRAFANA_URL',
    description: 'Grafana Visualization Dashboard Base URL',
    example: 'http://grafana:3000',
    howToCreate: 'Deploy Grafana container or Managed Grafana workspace',
    docLink: 'https://grafana.com/docs/grafana/latest/setup-grafana/',
    defaultValue: '',
    isSecret: false
  },
  {
    key: 'OTEL_EXPORTER_OTLP_ENDPOINT',
    description: 'OpenTelemetry OTLP Collector Endpoint URL',
    example: 'http://localhost:4318',
    howToCreate: 'Run OpenTelemetry Collector daemon for trace/metric ingestion',
    docLink: 'https://opentelemetry.io/docs/collector/',
    defaultValue: '',
    isSecret: false
  }
];

class EnvManager {
  /**
   * Auto-generate environment file templates if missing
   * @param {string} rootDir Workspace root directory path
   */
  ensureEnvFiles(rootDir = process.cwd()) {
    const envPath = path.join(rootDir, '.env');
    const envExamplePath = path.join(rootDir, '.env.example');
    const envLocalPath = path.join(rootDir, '.env.local');
    const envDevPath = path.join(rootDir, '.env.development');
    const envProdPath = path.join(rootDir, '.env.production');

    const generateTemplateContent = (envType) => {
      let content = `# ============================================================\n`;
      content += `# CloudOps Multi-Cloud Application Platform - ${envType.toUpperCase()} ENV\n`;
      content += `# Auto-generated on ${new Date().toISOString()}\n`;
      content += `# ============================================================\n\n`;

      for (const item of REQUIRED_ENV_VARS) {
        content += `# ${item.description}\n`;
        content += `# How to create: ${item.howToCreate}\n`;
        content += `# Doc: ${item.docLink}\n`;
        const val = item.defaultValue || (envType === 'example' ? item.example : '');
        content += `${item.key}=${val}\n\n`;
      }
      return content;
    };

    if (!fs.existsSync(envExamplePath)) {
      fs.writeFileSync(envExamplePath, generateTemplateContent('example'), 'utf8');
      console.log('[EnvManager] Auto-generated .env.example');
    }
    if (!fs.existsSync(envLocalPath)) {
      fs.writeFileSync(envLocalPath, generateTemplateContent('local'), 'utf8');
      console.log('[EnvManager] Auto-generated .env.local');
    }
    if (!fs.existsSync(envDevPath)) {
      fs.writeFileSync(envDevPath, generateTemplateContent('development'), 'utf8');
      console.log('[EnvManager] Auto-generated .env.development');
    }
    if (!fs.existsSync(envProdPath)) {
      fs.writeFileSync(envProdPath, generateTemplateContent('production'), 'utf8');
      console.log('[EnvManager] Auto-generated .env.production');
    }

    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, generateTemplateContent('local'), 'utf8');
      console.log('[EnvManager] Auto-generated primary .env');
    }
  }

  /**
   * Validate all required environment variables
   */
  validateEnvironment() {
    const results = [];
    let hasMissing = false;

    for (const item of REQUIRED_ENV_VARS) {
      const val = process.env[item.key];
      const isPresent = Boolean(val && val.trim().length > 0);

      const status = isPresent ? 'VALID' : (item.defaultValue ? 'VALID' : 'MISSING');
      if (status === 'MISSING') {
        hasMissing = true;
      }

      results.push({
        key: item.key,
        value: item.isSecret && isPresent ? '********' : (val || item.defaultValue || 'Not Set'),
        isPresent,
        isSecret: item.isSecret,
        status,
        description: item.description,
        exampleValue: item.example,
        howToCreate: item.howToCreate,
        docLink: item.docLink
      });
    }

    return {
      isValid: !hasMissing,
      timestamp: new Date().toISOString(),
      results
    };
  }

  /**
   * Sync environment validation state into DB
   */
  async syncEnvToDatabase(tenantId = 'demo-org-001') {
    const db = await getDatabase();
    const validation = this.validateEnvironment();

    for (const item of validation.results) {
      const id = `env-${tenantId}-${item.key}`;
      await db.run(`
        INSERT INTO env_configurations (
          id, tenant_id, key_name, value, description, example_value, how_to_create, doc_link, status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tenant_id, key_name) DO UPDATE SET
          value = excluded.value,
          status = excluded.status,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id, tenantId, item.key, item.value, item.description, item.exampleValue, item.howToCreate, item.docLink, item.status
      ]);
    }

    return validation;
  }
}

module.exports = new EnvManager();
