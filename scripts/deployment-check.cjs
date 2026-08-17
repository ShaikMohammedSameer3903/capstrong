const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

require('../server/node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('🚀 [DEPLOYMENT CHECK] Starting Enterprise Deployment Validation Checks...');

// 1. Build Verification
try {
  console.log('[DEPLOYMENT CHECK] Compiling frontend assets...');
  execSync('npm run build', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  console.log('✓ [DEPLOYMENT CHECK] Frontend build compiled successfully.');
} catch (buildErr) {
  console.error('✗ [DEPLOYMENT CHECK] Frontend build failed!');
  process.exit(1);
}

// 2. Target Port setup
let targetPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
let backend = null;

async function setupBackend() {
  try {
    const res = await getJson(`http://127.0.0.1:${targetPort}/health`);
    if (res && res.status === 'healthy') {
      console.log(`[DEPLOYMENT CHECK] Backend is already running on port ${targetPort}.`);
      return;
    }
  } catch (_) {
    // Backend not running, spawn it
  }

  const serverPath = path.resolve(__dirname, '../server/index.js');
  console.log('[DEPLOYMENT CHECK] Launching backend server process...');
  backend = spawn('node', [serverPath], {
    env: { ...process.env },
    shell: false
  });

  backend.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`[BACKEND STDOUT] ${output}`);
    const portMatch = output.match(/port\s+(\d+)/i);
    if (portMatch) {
      targetPort = parseInt(portMatch[1], 10);
    }
  });

  backend.stderr.on('data', (data) => {
    process.stderr.write(`[BACKEND STDERR] ${data.toString()}`);
  });

  backend.on('error', (err) => {
    console.error('[DEPLOYMENT CHECK] Backend process error:', err);
  });
}

// Helper to query http
function getJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const dataStr = JSON.stringify(payload);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

// 3. Retry connection loop
let retries = 45;
const probeInterval = 1000;

function runValidation() {
  if (retries <= 0) {
    console.error('✗ [DEPLOYMENT CHECK] Backend failed to boot within timeout.');
    if (backend) backend.kill();
    process.exit(1);
  }

  getJson(`http://127.0.0.1:${targetPort}/health`)
    .then(async () => {
      console.log('✓ [DEPLOYMENT CHECK] Backend is healthy & listening.');

      // Query Deployment Health Endpoint
      const deployHealth = await getJson(`http://127.0.0.1:${targetPort}/api/health/deployment`);
      console.log('[DEPLOYMENT CHECK] Deployment status payload:', deployHealth);

      if (deployHealth.database !== 'healthy') {
        throw new Error('Database is offline or not healthy');
      }
      if (deployHealth.jwt !== 'healthy') {
        throw new Error('JWT Secret configuration missing');
      }

      console.log('✓ [DEPLOYMENT CHECK] Database and JWT checks passed.');

      // Validate JWT Authentication & Session Resolution
      console.log('[DEPLOYMENT CHECK] Validating JWT session authentication & RBAC resolution...');
      const sqlite3 = require('../server/node_modules/sqlite3');
      const { open } = require('../server/node_modules/sqlite');
      const jwt = require('../server/node_modules/jsonwebtoken');
      const dbPath = path.resolve(__dirname, '../server/cloudops.db');
      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      const row = await db.get('SELECT id, email, role FROM users ORDER BY id ASC LIMIT 1');
      if (!row) {
        throw new Error('No user found in database. Bootstrap seeding may have failed.');
      }
      const adminEmail = row.email;
      const userId = row.id || 'usr-001';
      const sessionId = 'val-session-' + Date.now();

      await db.run(`
        INSERT INTO sessions (session_id, user_id, email, provider, ip_address, user_agent, login_time, last_active, revoked)
        VALUES (?, ?, ?, 'Local', '127.0.0.1', 'DeploymentCheck', datetime('now'), datetime('now'), 0)
      `, [sessionId, userId, adminEmail]);

      const jwtSecret = process.env.JWT_SECRET || 'local-secret-key-12345';
      const testToken = jwt.sign(
        { sessionId, id: userId, email: adminEmail, tenantId: 'demo-org-001', role: row.role || 'Admin' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      console.log('✓ [DEPLOYMENT CHECK] Generated valid session token.');

      try {
        console.log('[DEPLOYMENT CHECK] Probing protected cloud-accounts endpoint...');
        const accountsRes = await getJson(`http://127.0.0.1:${targetPort}/api/cloud-accounts`, {
          headers: {
            'Authorization': `Bearer ${testToken}`
          }
        });

        if (!accountsRes || accountsRes.success === false) {
          throw new Error('Protected endpoint did not validate tenant context correctly.');
        }
        console.log('✓ [DEPLOYMENT CHECK] Protected API reachable & Session context verified.');

      } finally {
        await db.run('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
        await db.close();
      }

      console.log('====================================================');
      console.log('🎉 [DEPLOYMENT CHECK PASS] All production gates OK.');
      console.log('====================================================');
      if (backend) backend.kill();
      process.exit(0);
    })
    .catch((err) => {
      console.log(`[DEPLOYMENT CHECK] Probing backend... (${retries} attempts left). Error: ${err.message}`);
      retries--;
      setTimeout(runValidation, probeInterval);
    });
}

// Start setup & validation
setupBackend().then(() => {
  setTimeout(runValidation, 1000);
});
