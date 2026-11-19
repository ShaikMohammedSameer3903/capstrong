// ============================================================
// Single Command Start Script (CommonJS)
// Boots both backend and frontend development environments
// ============================================================

const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('[START] Launching production-ready local development stack...');

// Free up occupied local ports if previously left hanging
try {
  if (process.platform === 'win32') {
    execSync('powershell -Command "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"', { stdio: 'ignore' });
  }
} catch (_) {}

// Start Backend API Server
const backend = spawn('node', ['index.js'], {
  cwd: path.join(__dirname, 'server'),
  env: { ...process.env, PORT: '3001', NODE_ENV: 'development' },
  shell: false,
});

backend.stdout.on('data', (data) => {
  console.log(`[BACKEND] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
});

// Start Frontend Vite Server
const frontend = spawn('node', [path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js')], {
  cwd: __dirname,
  shell: false,
});

frontend.stdout.on('data', (data) => {
  console.log(`[FRONTEND] ${data.toString().trim()}`);
});

frontend.stderr.on('data', (data) => {
  console.error(`[FRONTEND ERROR] ${data.toString().trim()}`);
});

// Handle termination gracefully
function killServices() {
  console.log('\n[START] Shutting down services...');
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', killServices);
process.on('SIGTERM', killServices);
process.on('exit', () => {
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
});
