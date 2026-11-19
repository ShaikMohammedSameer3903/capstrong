// ============================================================
// Workspace Manager Service
// Safe temporary workspace allocation, git clone, path traversal protection,
// token masking, and lifecycle cleanup for CloudOps deployments.
// ============================================================

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class WorkspaceManager {
  constructor() {
    this._resolvedBase = null;
  }

  /**
   * Determine guaranteed writable base directory for deployment workspaces.
   */
  getBaseDir() {
    if (this._resolvedBase) return this._resolvedBase;

    const candidates = [
      process.env.DEPLOYMENT_WORKSPACE_DIR,
      path.join(__dirname, '..', 'data', 'workspaces'),
      path.join(os.tmpdir(), 'cloudops_workspaces'),
      path.join(process.cwd(), 'temp_workspaces')
    ].filter(Boolean);

    for (const cand of candidates) {
      try {
        if (!fs.existsSync(cand)) {
          fs.mkdirSync(cand, { recursive: true, mode: 0o777 });
        }
        // Probe writability
        const probeFile = path.join(cand, `.write_probe_${Date.now()}_${Math.random().toString(36).substring(2)}`);
        fs.writeFileSync(probeFile, 'ok', 'utf8');
        fs.unlinkSync(probeFile);
        this._resolvedBase = cand;
        return cand;
      } catch (err) {
        // Candidate not writable, try next
      }
    }

    // Absolute fallback
    const fallback = path.join(os.tmpdir(), 'cloudops_workspaces');
    try { fs.mkdirSync(fallback, { recursive: true, mode: 0o777 }); } catch (_) {}
    this._resolvedBase = fallback;
    return fallback;
  }

  /**
   * Determine safe directory for app preview / cached assets.
   */
  getAppDirectory(slug) {
    const cleanSlug = this.sanitizeSlug(slug);
    const candidates = [
      path.join(__dirname, '..', 'data', 'apps', cleanSlug),
      path.join(this.getBaseDir(), 'apps', cleanSlug)
    ];

    for (const cand of candidates) {
      try {
        if (!fs.existsSync(cand)) {
          fs.mkdirSync(cand, { recursive: true, mode: 0o777 });
        }
        return cand;
      } catch (_) {}
    }

    const fallback = path.join(os.tmpdir(), 'cloudops_apps', cleanSlug);
    try { fs.mkdirSync(fallback, { recursive: true, mode: 0o777 }); } catch (_) {}
    return fallback;
  }

  /**
   * Sanitize slug to prevent path traversal and shell injection.
   */
  sanitizeSlug(input) {
    if (!input || typeof input !== 'string') return 'app';
    return input
      .trim()
      .replace(/\.\./g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'app';
  }

  /**
   * Sanitize Git URL for safe logging (removes tokens/passwords).
   */
  sanitizeRepoUrl(raw) {
    if (!raw) return '';
    let str = String(raw).trim();
    // Mask credentials in https://user:token@github.com/... or https://token@github.com/...
    return str.replace(/https?:\/\/([^@\s]+)@/gi, 'https://***@');
  }

  /**
   * Prepare a dedicated workspace for a specific deployment.
   */
  createWorkspace(appName, deploymentId) {
    const slug = this.sanitizeSlug(appName);
    const cleanDepId = String(deploymentId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '');
    const base = this.getBaseDir();
    const workspaceDir = path.join(base, `${slug}-${cleanDepId}`);

    if (fs.existsSync(workspaceDir)) {
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch (_) {}
    }

    fs.mkdirSync(workspaceDir, { recursive: true, mode: 0o777 });
    return {
      slug,
      workspaceDir,
      artifactDir: path.join(base, 'artifacts', `${slug}-${cleanDepId}`)
    };
  }

  /**
   * Clean up workspace temporary files (e.g. node_modules, source clone).
   */
  cleanupWorkspace(workspaceDir) {
    if (!workspaceDir || !fs.existsSync(workspaceDir)) return;
    try {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`[WorkspaceManager] Failed to clean up ${workspaceDir}: ${e.message}`);
    }
  }

  /**
   * Archive build artifacts for rollback capability.
   */
  archiveArtifacts(sourceDir, destinationDir) {
    if (!fs.existsSync(sourceDir)) return false;
    try {
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true, mode: 0o777 });
      }
      fs.cpSync(sourceDir, destinationDir, { recursive: true });
      return true;
    } catch (err) {
      console.warn(`[WorkspaceManager] Artifact archiving notice: ${err.message}`);
      return false;
    }
  }
}

module.exports = new WorkspaceManager();
