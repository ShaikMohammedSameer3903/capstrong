const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Keys that must NEVER be overwritten with empty defaults when Docker/CI
// already injected them via environment variables.
const CREDENTIAL_KEYS = new Set([
  'AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_SUBSCRIPTION_ID',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  'JWT_SECRET', 'SESSION_SECRET', 'REFRESH_SECRET',
  'MONGODB_URI', 'MONGODB_DB'
]);

function bootstrapEnv() {
  // ── Docker / CI fast-path ────────────────────────────────────────────────
  // When the process already has the key credentials injected (e.g. by Docker
  // Compose env_file or Kubernetes secrets), skip ALL file I/O.  Writing a
  // generated .env file and then calling dotenv.config() would clobber the
  // already-correct values with empty-string defaults.
  // Load any variables from .env file that are missing in process.env
  const candidatePaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env')
  ];
  let envPath = candidatePaths.find(p => fs.existsSync(p));
  if (envPath) {
    try {
      const fileContent = fs.readFileSync(envPath, 'utf8');
      const lines = fileContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key] && val) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[BOOTSTRAP] Error reading fallback .env:', e.message);
    }
  }

  const alreadyInjected =
    process.env.AZURE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.JWT_SECRET;

  if (alreadyInjected) {
    // Only generate LOCAL_ADMIN credentials if missing — no file writes.
    _ensureLocalAdmin();
    console.log('[BOOTSTRAP] Credentials already injected or loaded from .env. Skipping generated file writes.');
    return;
  }

  // ── Local development path ───────────────────────────────────────────────
  envPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  let envContent = '';
  let exists = fs.existsSync(envPath);

  if (exists) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Parse existing variables from the .env file
  const envVars = {};
  if (exists) {
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          envVars[key] = val;
        }
      }
    }
  }

  // Merge process.env on top — host env always wins over file values
  for (const [key, val] of Object.entries(process.env)) {
    if (val !== undefined && val !== '') {
      envVars[key] = val;
    }
  }

  let envUpdated = false;

  // 1. JWT_SECRET — generate if truly missing everywhere
  if (!envVars.JWT_SECRET) {
    envVars.JWT_SECRET = crypto.randomBytes(64).toString('hex');
    envUpdated = true;
    console.log('[BOOTSTRAP] JWT_SECRET generated.');
  }

  // 2. Local Admin credentials
  if (!envVars.LOCAL_ADMIN_EMAIL) {
    envVars.LOCAL_ADMIN_EMAIL = 'admin@cloudops-local.com';
    envUpdated = true;
  }

  let generatedPassword = null;
  if (!envVars.LOCAL_ADMIN_PASSWORD_HASH) {
    generatedPassword = crypto.randomBytes(12).toString('hex') + 'A1!';
    const salt = bcrypt.genSaltSync(10);
    envVars.LOCAL_ADMIN_PASSWORD_HASH = bcrypt.hashSync(generatedPassword, salt);
    envUpdated = true;
  } else {
    const hashVal = envVars.LOCAL_ADMIN_PASSWORD_HASH;
    if (!hashVal.startsWith('$2a$') && !hashVal.startsWith('$2b$')) {
      const salt = bcrypt.genSaltSync(10);
      envVars.LOCAL_ADMIN_PASSWORD_HASH = bcrypt.hashSync(hashVal, salt);
      envUpdated = true;
      console.log('[BOOTSTRAP] Plaintext password hashed with bcrypt.');
    }
  }

  // 3. Session secrets
  if (!envVars.SESSION_SECRET) { envVars.SESSION_SECRET = crypto.randomBytes(32).toString('hex'); envUpdated = true; }
  if (!envVars.REFRESH_SECRET) { envVars.REFRESH_SECRET = crypto.randomBytes(32).toString('hex'); envUpdated = true; }

  // 4. Write updated .env if anything changed — but NEVER overwrite credential keys with empty values
  if (envUpdated || !exists) {
    const keysInTemplate = new Set([
      'LOCAL_ADMIN_EMAIL', 'LOCAL_ADMIN_PASSWORD_HASH', 'LOCAL_ADMIN_PASSWORD',
      'JWT_SECRET', 'SESSION_SECRET', 'REFRESH_SECRET',
      'AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_SUBSCRIPTION_ID',
      'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
      'VITE_API_URL', 'VITE_API_BASE_URL'
    ]);

    const newLines = [
      '# Single-Administrator Authentication',
      `LOCAL_ADMIN_EMAIL=${envVars.LOCAL_ADMIN_EMAIL || ''}`,
      `LOCAL_ADMIN_PASSWORD_HASH=${envVars.LOCAL_ADMIN_PASSWORD_HASH || ''}`,
      '',
      '# Secrets configuration',
      `JWT_SECRET=${envVars.JWT_SECRET || ''}`,
      `SESSION_SECRET=${envVars.SESSION_SECRET || ''}`,
      `REFRESH_SECRET=${envVars.REFRESH_SECRET || ''}`,
      '',
      '# Production Azure SDK Credentials',
      `AZURE_CLIENT_ID=${envVars.AZURE_CLIENT_ID || ''}`,
      `AZURE_TENANT_ID=${envVars.AZURE_TENANT_ID || ''}`,
      `AZURE_CLIENT_SECRET=${envVars.AZURE_CLIENT_SECRET || ''}`,
      `AZURE_SUBSCRIPTION_ID=${envVars.AZURE_SUBSCRIPTION_ID || ''}`,
      '',
      '# Google OAuth Credentials',
      `GOOGLE_CLIENT_ID=${envVars.GOOGLE_CLIENT_ID || ''}`,
      `GOOGLE_CLIENT_SECRET=${envVars.GOOGLE_CLIENT_SECRET || ''}`,
      '',
      '# Frontend',
      `VITE_API_URL=${envVars.VITE_API_URL || ''}`,
      `VITE_API_BASE_URL=${envVars.VITE_API_BASE_URL || ''}`
    ];

    // Append any extra vars not already in the template
    for (const [key, val] of Object.entries(envVars)) {
      if (!keysInTemplate.has(key)) {
        newLines.push(`${key}=${val}`);
      }
    }

    try {
      fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
      console.log('[BOOTSTRAP] .env file created/updated at:', envPath);
    } catch (writeErr) {
      console.warn('[BOOTSTRAP] Could not write .env file (read-only fs?):', writeErr.message);
    }
  }

  if (generatedPassword) {
    console.log('\n================================');
    console.log('LOCAL ADMIN ACCOUNT CREATED');
    console.log(`Email: ${envVars.LOCAL_ADMIN_EMAIL}`);
    console.log(`Password: ${generatedPassword}`);
    console.log('==============================\n');
  }

  // Load the .env file into process.env WITHOUT overriding existing values
  try {
    require('dotenv').config({ path: envPath, override: false });
  } catch (_) {}

  // Final safety pass: ensure credential keys from envVars are in process.env
  for (const [key, val] of Object.entries(envVars)) {
    if (val && (!process.env[key] || process.env[key] === '')) {
      process.env[key] = val;
    }
  }
}

// Generate/validate LOCAL_ADMIN credentials in-memory only (no file I/O)
function _ensureLocalAdmin() {
  if (!process.env.LOCAL_ADMIN_EMAIL) {
    process.env.LOCAL_ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL || 'admin@cloudops-local.com';
  }
  if (process.env.LOCAL_ADMIN_PASSWORD && !process.env.LOCAL_ADMIN_PASSWORD_HASH) {
    const salt = bcrypt.genSaltSync(10);
    process.env.LOCAL_ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.LOCAL_ADMIN_PASSWORD, salt);
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
  }
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  }
  if (!process.env.REFRESH_SECRET) {
    process.env.REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
  }
}

module.exports = { bootstrapEnv };
