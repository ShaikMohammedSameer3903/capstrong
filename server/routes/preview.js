const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// MIME types mapping for preview static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function resolveAppDirectory(appName) {
  const cleanApp = (appName || '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const baseData = path.join(__dirname, '..', 'data');
  const candidates = [];

  // 1. Direct app directory in data/apps
  candidates.push(path.join(baseData, 'apps', cleanApp));

  // 2. Cached repos in data/cached_repos matching cleanApp
  const cachedReposDir = path.join(baseData, 'cached_repos');
  if (fs.existsSync(cachedReposDir)) {
    try {
      const entries = fs.readdirSync(cachedReposDir);
      // Priority 2a: exact prefix match (e.g. portfolio_537de6c2b4 or portfolio-3_537de6c2b4)
      for (const entry of entries) {
        if (entry.toLowerCase().startsWith(cleanApp + '_') || entry.toLowerCase() === cleanApp) {
          candidates.push(path.join(cachedReposDir, entry));
        }
      }
      // Priority 2b: base prefix match (e.g. portfolio)
      const baseWord = cleanApp.split('-')[0].split('_')[0];
      for (const entry of entries) {
        if (entry.toLowerCase().startsWith(baseWord + '_') || entry.toLowerCase().startsWith(baseWord + '-')) {
          candidates.push(path.join(cachedReposDir, entry));
        }
      }
    } catch (_) {}
  }

  // 3. Fallback for portfolio
  if (cleanApp.includes('portfolio')) {
    candidates.push(path.join(baseData, 'portfolio_repo'));
  }

  // Check which candidate has index.html
  for (const cand of candidates) {
    if (!fs.existsSync(cand)) continue;
    // Check subdirectories
    for (const sub of ['dist', 'build', 'out', 'public', '']) {
      const checkPath = sub ? path.join(cand, sub) : cand;
      if (fs.existsSync(path.join(checkPath, 'index.html'))) {
        return checkPath;
      }
    }
    if (fs.existsSync(path.join(cand, 'index.html'))) {
      return cand;
    }
  }

  // Fallback to first existing directory or null
  return candidates.find(c => fs.existsSync(c)) || null;
}

// Handler for /api/preview/:appName and /api/preview/:appName/*
router.get('/:appName*', (req, res) => {
  const appName = req.params.appName;
  const appDir = resolveAppDirectory(appName);

  if (!appDir || !fs.existsSync(appDir)) {
    return res.status(404).send(`<!DOCTYPE html>
<html>
<head><title>CloudOps Preview - 404</title></head>
<body style="font-family: sans-serif; background: #030712; color: #f8fafc; padding: 40px; text-align: center;">
  <h2>CloudOps Application Preview</h2>
  <p style="color: #94a3b8;">No deployed assets found for application: <strong>${appName}</strong></p>
  <p style="color: #64748b; font-size: 13px;">Please trigger a deployment from the CloudOps Deployment Center to build and host this application.</p>
</body>
</html>`);
  }

  // Determine requested sub-path
  // req.params[0] contains the rest of the wildcard path
  let subPath = req.params[0] || '/';
  if (subPath.startsWith('/')) subPath = subPath.substring(1);
  if (!subPath || subPath === '') subPath = 'index.html';

  let filePath = path.join(appDir, subPath);

  // If path is a directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If file doesn't exist, try index.html (SPA fallback)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(appDir, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Resource not found in application bundle.');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache');

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    res.status(500).send(`Error reading asset: ${err.message}`);
  });
  stream.pipe(res);
});

module.exports = router;
