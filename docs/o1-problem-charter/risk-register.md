# O1 — Risk Register

**Document ID**: CLOUD-223-O1-RISKS  
**Date**: 2026-08-02

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|-----------|--------|------------|-------|
| R1 | Cloud credentials expire mid-experiment | Medium | High | Credential check at deployment start (step 2); graceful failure logging | Platform Engineer |
| R2 | Provider SDK breaking changes between versions | Low | High | Version lock in `reference-impl/VERSION.lock`; pinned in `package.json` | Platform Engineer |
| R3 | Evidence files tampered after generation | Low | Critical | SHA-256 checksums in `evidence/manifest.json`; DB registration | Platform Engineer |
| R4 | KPI thresholds changed after Gate G0 | Low | Critical | Frozen file with timestamp anchor; approved deviation protocol | Platform Engineer |
| R5 | Chaos experiment causes unrecoverable damage | Medium | High | Simulation fallback with fidelity documentation; containment via Docker/K8s isolation | Platform Engineer |
| R6 | Insufficient deployment samples for statistical validity | Medium | Medium | KPI-4 requires ≥3 trials; repeatability metric reported | Platform Engineer |
| R7 | Network conditions vary between trial runs | High | Medium | Document test conditions; report variability/uncertainty per KPI | Platform Engineer |
| R8 | Database corruption during chaos experiments | Low | High | SQLite WAL mode; transactional rollback; backup before experiments | Platform Engineer |
| R9 | Frontend displays stale/cached data | Medium | Low | API responses include `timestamp` and `evidenceBacking` fields | Platform Engineer |
| R10 | Evidence partition contamination (dev → acceptance) | Low | Critical | Separate directories; manifest tracks partition; EvidenceWriter enforces | Platform Engineer |
