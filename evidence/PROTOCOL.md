# Evidence & Reproducibility Protocol

**Document ID**: CLOUD-223-PROTOCOL  
**Date**: 2026-08-02  

---

## 1. Directory Structure

```
evidence/
├── manifest.json                  # Master manifest tracking SHA-256 for all evidence runs
├── kpi-results.md                 # Baseline-target-achieved summary table
├── PROTOCOL.md                    # This evidence protocol specification
├── final-self-audit.md            # Answers to mandatory self-audit questions
└── runs/
    ├── dev/                       # Development partition evidence files
    └── acceptance/                # Acceptance partition evidence files (NT-1..NT-5, chaos)
        ├── nt-1/
        ├── nt-2/
        ├── nt-3/
        ├── nt-4/
        ├── nt-5/
        └── nt-chaos/
```

## 2. Integrity & Reproducibility Rules

1. Every evidence file is written in JSON format with an `_evidenceMeta` envelope containing `runId`, `runType`, `partition`, `generatedBy`, and `generatedAt`.
2. Every file write computes a SHA-256 hash registered in `evidence_runs` table and `evidence/manifest.json`.
3. To reproduce all evidence: run `node test-suite/run-all-tests.cjs`.
