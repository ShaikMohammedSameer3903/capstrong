# KL UNIVERSITY CAPSTONE PROJECT FINAL SUBMISSION REPORT
## Canonical ID: CLOUD-223 — Application Platform Abstraction Over Heterogeneous Cloud Infrastructure

**Student / Candidate**: Shaik Mohammed Sameer (Reg. No: 2300031607)  
**Institution**: KL University • Department of Cloud, Edge & DevOps Engineering  
**Project ID**: CLOUD-223  
**Audit Status**: See `evidence/final-self-audit.md` for evidence-backed audit  
**Target Environments**: Microsoft Azure, Amazon Web Services (AWS), Google Cloud Platform (GCP)

---

## 1. Project Abstract & Objective

Enterprise cloud strategy often attempts to place a high-level application platform abstraction over heterogeneous cloud infrastructure so developers can deploy applications without needing to handle low-level cloud provider nuances. However, standard abstractions leak underlying infrastructure differences where they matter most—such as storage classes, network policies, node capabilities, and ingress controllers.

This capstone project delivers a reference implementation of an Application Platform Abstraction layer that:
1. **Identifies and measures infrastructure leaks** — see `gate-g0/limitation-study.md` and `evidence/o3-ablation.md`
2. **Executes side-by-side behavioral comparison** — see `evidence/o3-condition-wise-error.md` and `evidence/kpi-results.md`
3. **Implements a mandatory negative-test fault campaign** — see `test-suite/negative-tests/` and `evidence/o5-acceptance-dossier.md`

---

## 2. Evidence-Backed Requirement Verification

| Requirement | Evidence File | Status |
| :--- | :--- | :---: |
| **O1. Problem Validation** | `gate-g0/limitation-study.md`, `gate-g0/kpi-thresholds-frozen.md` | See evidence |
| **O2. Reference Implementation** | `reference-impl/VERSION.lock`, `evidence/o2-baseline-results.md` | See evidence |
| **O3. Behavioral Comparison** | `evidence/o3-ablation.md`, `evidence/o3-condition-wise-error.md` | See evidence |
| **O4. System Integration** | `evidence/o4-integration-evidence.md`, `docs/o4-fault-simulation-method.md` | See evidence |
| **O5. Acceptance Decision** | `evidence/o5-acceptance-dossier.md`, `evidence/kpi-results.md` | See evidence |

> **Note**: Pass/fail status is determined by comparing achieved values against frozen KPI thresholds in `gate-g0/kpi-thresholds-frozen.md`. This report does not self-certify any outcome.

---

## 3. Negative-Test Campaign

Executable negative tests in `test-suite/negative-tests/`:
1. **NT-1**: Abstraction leaking on storage and network
2. **NT-2**: Application behaving differently under identical deployment
3. **NT-3**: Platform reporting false-positive deployment success
4. **NT-4**: Partial failure leaving inconsistent state
5. **NT-5**: Retry/concurrency duplicating work or corrupting state

Each test writes raw evidence to `evidence/runs/acceptance/nt-{1..5}/`.

---

## 4. Evidence Trail & Reproducibility

- **Evidence Protocol**: `docs/o1-problem-charter/evidence-protocol.md`
- **Evidence Manifest**: `evidence/manifest.json` (SHA-256 integrity for all evidence files)
- **Reproducibility Script**: `reference-impl/reproduce.js`
- **Self-Audit**: `evidence/final-self-audit.md`

---

## 5. Project Handover

All evidence, test results, and KPI measurements are available for independent verification.
See `evidence/final-self-audit.md` for the complete self-audit with file citations.
