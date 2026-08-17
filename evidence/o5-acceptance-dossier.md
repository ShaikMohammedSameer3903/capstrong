# O5 Acceptance Dossier — Mandatory Fault Campaign & Negative Tests

**Document ID**: CLOUD-223-O5-DOSSIER  
**Date**: 2026-08-02  
**Test Suite Runner**: `test-suite/run-all-tests.cjs`  
**Manifest Reference**: `evidence/manifest.json`

---

## 1. Negative Test Campaign Summary

| Test ID | Test Name | Target Result | Achieved Result | Evidence File |
|---------|-----------|---------------|-----------------|---------------|
| **NT-1** | Storage & Network Abstraction Leakage | PASS | **PASS** | `evidence/runs/acceptance/nt-1/2026-08-02T15-25-34-291Z-multi-negative-test.json` |
| **NT-2** | Behavioral Variance Underneath | PASS | **PASS** | `evidence/runs/acceptance/nt-2/2026-08-02T15-25-34-334Z-multi-negative-test.json` |
| **NT-3** | False-Positive Success Prevention | PASS | **PASS** | `evidence/runs/acceptance/nt-3/2026-08-02T15-25-34-337Z-multi-negative-test.json` |
| **NT-4** | Partial Failure & State Consistency | PASS | **PASS** | `evidence/runs/acceptance/nt-4/2026-08-02T15-25-34-469Z-multi-negative-test.json` |
| **NT-5** | Retry & Concurrency Idempotency | PASS | **PASS** | `evidence/runs/acceptance/nt-5/2026-08-02T15-25-35-050Z-multi-negative-test.json` |

---

## 2. Overall Campaign Result

- **Total Negative Tests**: 5 / 5
- **Pass Rate**: 100%
- **Evidence Directory**: `evidence/runs/acceptance/`
- **SHA-256 Checksums**: Verified in `evidence/manifest.json`
