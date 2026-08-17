# O2 Baseline Results — Reference Implementation Performance

**Document ID**: CLOUD-223-O2-BASELINE  
**Date**: 2026-08-02  
**Version Lock**: `reference-impl/VERSION.lock`  
**Oracle Script**: `reference-impl/oracle/verify-deployment.js`

---

## 1. Summary

The reference implementation baseline evaluates the unified deployment pipeline across supported cloud provider targets (Azure, AWS, GCP).

## 2. Measured Baseline Performance

| Metric Category | Azure | AWS | GCP | Unit | Source |
|-----------------|-------|-----|-----|------|--------|
| **Average Network Latency** | 22.0 | 45.0 | 35.0 | ms | `infraDiffEngine.js` matrix evaluation |
| **Storage Sequential Read** | 380.0 | 410.0 | 390.0 | MB/s | `infraDiffEngine.js` matrix evaluation |
| **Container Cold Start** | 2.40 | 1.80 | 1.20 | s | `infraDiffEngine.js` matrix evaluation |
| **Memory Allocation** | 512 | 512 | 512 | MB | `deploymentService.js` spec |

## 3. Evidence Traceability

Each baseline run writes a JSON evidence envelope to `evidence/runs/dev/` and registers SHA-256 hashes in `evidence/manifest.json`.
