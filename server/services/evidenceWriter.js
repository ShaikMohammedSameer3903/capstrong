// ============================================================
// Evidence Writer — CLOUD-223 Capstone Evidence Protocol
//
// Every numeric claim in the app or docs must trace back to a raw
// evidence file under evidence/runs/.  This module:
//   1. Writes structured JSON evidence to evidence/runs/{partition}/
//   2. Computes the SHA-256 hash of every file it writes
//   3. Registers the file in the evidence_runs DB table
//   4. Returns the run_id / file_path for downstream citation
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDatabase } = require('../db/database');

const EVIDENCE_ROOT = path.resolve(__dirname, '..', '..', 'evidence', 'runs');

class EvidenceWriter {
  /**
   * Write an evidence record to disk and register it in the DB.
   *
   * @param {object} opts
   * @param {string} opts.runType      — 'deployment'|'chaos'|'diff'|'ablation'|'sensitivity'|'acceptance'|'integration'|'negative-test'
   * @param {string} opts.partition    — 'dev' or 'acceptance'
   * @param {string} opts.provider     — 'azure'|'aws'|'gcp'|null
   * @param {string} opts.generatedBy  — module/script that produced this evidence
   * @param {object} opts.data         — the raw evidence payload (will be JSON-serialized)
   * @param {string} [opts.subDir]     — optional subdirectory under partition (e.g. 'nt-1')
   * @returns {Promise<{runId: string, filePath: string, sha256: string}>}
   */
  async write({ runType, partition, provider, generatedBy, data, subDir }) {
    if (!['dev', 'acceptance'].includes(partition)) {
      throw new Error(`Invalid evidence partition: ${partition}. Must be 'dev' or 'acceptance'.`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runId = `${runType}-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;
    const fileName = `${timestamp}-${provider || 'multi'}-${runType}.json`;

    // Build target directory
    let targetDir = path.join(EVIDENCE_ROOT, partition);
    if (subDir) {
      targetDir = path.join(targetDir, subDir);
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const filePath = path.join(targetDir, fileName);
    const relativePath = path.relative(path.resolve(__dirname, '..', '..'), filePath).replace(/\\/g, '/');

    // Build evidence envelope
    const envelope = {
      _evidenceMeta: {
        runId,
        runType,
        partition,
        provider: provider || null,
        generatedBy,
        generatedAt: new Date().toISOString(),
        schemaVersion: '1.0.0'
      },
      data
    };

    const jsonContent = JSON.stringify(envelope, null, 2);
    const sha256 = crypto.createHash('sha256').update(jsonContent).digest('hex');

    // Write file
    fs.writeFileSync(filePath, jsonContent, 'utf-8');

    // Register in DB
    try {
      const db = await getDatabase();
      await db.run(`
        INSERT INTO evidence_runs (id, run_id, run_type, provider, partition, file_path, sha256, generated_by, generated_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `ev-${crypto.randomBytes(8).toString('hex')}`,
        runId,
        runType,
        provider || null,
        partition,
        relativePath,
        sha256,
        generatedBy,
        new Date().toISOString(),
        JSON.stringify({ fileName })
      ]);
    } catch (dbErr) {
      // If DB registration fails (e.g. table not yet migrated), still keep the file
      console.warn(`[EvidenceWriter] DB registration failed (file still saved): ${dbErr.message}`);
    }

    return { runId, filePath: relativePath, sha256 };
  }

  /**
   * Read all evidence runs from DB, optionally filtered.
   * @param {object} [filters] — { runType, partition, provider }
   * @returns {Promise<Array>}
   */
  async list(filters = {}) {
    const db = await getDatabase();
    let query = 'SELECT * FROM evidence_runs WHERE 1=1';
    const params = [];

    if (filters.runType) {
      query += ' AND run_type = ?';
      params.push(filters.runType);
    }
    if (filters.partition) {
      query += ' AND partition = ?';
      params.push(filters.partition);
    }
    if (filters.provider) {
      query += ' AND provider = ?';
      params.push(filters.provider);
    }

    query += ' ORDER BY generated_at DESC';
    return db.all(query, params);
  }

  /**
   * Read an evidence file's data payload by run_id.
   * @param {string} runId
   * @returns {Promise<object|null>}
   */
  async readByRunId(runId) {
    const db = await getDatabase();
    const row = await db.get('SELECT * FROM evidence_runs WHERE run_id = ?', [runId]);
    if (!row) return null;

    const absPath = path.resolve(__dirname, '..', '..', row.file_path);
    if (!fs.existsSync(absPath)) return null;

    const content = JSON.parse(fs.readFileSync(absPath, 'utf-8'));

    // Verify integrity
    const actualSha = crypto.createHash('sha256').update(JSON.stringify(content, null, 2)).digest('hex');
    if (actualSha !== row.sha256) {
      console.warn(`[EvidenceWriter] SHA-256 mismatch for ${runId}: expected ${row.sha256}, got ${actualSha}`);
    }

    return { ...row, content };
  }

  /**
   * Generate manifest.json for all evidence files on disk.
   * @returns {object} manifest
   */
  async generateManifest() {
    const db = await getDatabase();
    const rows = await db.all('SELECT * FROM evidence_runs ORDER BY generated_at ASC');

    let files = rows.map(r => ({
      file: r.file_path,
      sha256: r.sha256,
      generated_by: r.generated_by,
      generated_at: r.generated_at,
      provider: r.provider,
      run_type: r.run_type,
      partition: r.partition,
      run_id: r.run_id
    }));

    // Fallback/Supplement: Scan evidence/runs directory recursively
    const scanDir = (dir) => {
      let results = [];
      if (!fs.existsSync(dir)) return results;
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(scanDir(filePath));
        } else if (file.endsWith('.json')) {
          results.push(filePath);
        }
      });
      return results;
    };

    const diskFiles = scanDir(EVIDENCE_ROOT);
    const existingRelPaths = new Set(files.map(f => f.file));

    for (const absPath of diskFiles) {
      const relPath = path.relative(path.resolve(__dirname, '..', '..'), absPath).replace(/\\/g, '/');
      if (!existingRelPaths.has(relPath)) {
        try {
          const content = fs.readFileSync(absPath, 'utf-8');
          const sha256 = crypto.createHash('sha256').update(content).digest('hex');
          const stat = fs.statSync(absPath);
          files.push({
            file: relPath,
            sha256,
            generated_by: 'filesystem-scan',
            generated_at: stat.mtime.toISOString(),
            provider: null,
            run_type: relPath.includes('acceptance') ? 'acceptance' : 'dev',
            partition: relPath.includes('acceptance') ? 'acceptance' : 'dev',
            run_id: path.basename(absPath, '.json')
          });
        } catch (_) {}
      }
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      totalFiles: files.length,
      files
    };

    const manifestPath = path.join(EVIDENCE_ROOT, '..', 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    return manifest;
  }
}

module.exports = new EvidenceWriter();
