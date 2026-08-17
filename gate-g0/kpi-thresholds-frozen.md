# Gate G0 — KPI Thresholds (FROZEN)

**Document ID**: CLOUD-223-G0-KPI-FROZEN  
**Frozen Date**: 2026-08-02T20:40:00+05:30  
**Author**: Shaik Mohammed Sameer (2300031607)

> **ANCHOR RULE**: Nothing after the frozen date above may change the baseline, target, or pass/fail rules for KPI-1 through KPI-5 without an explicit "Approved Deviation" entry appended to the end of this file.

---

## KPI-1: Leakage Points Identified

| Property | Value |
|----------|-------|
| **Metric unit** | Count of distinct, reproduced leakage categories |
| **Baseline** | 0 (no leakage detection before this project) |
| **Target** | ≥ 3 distinct leakage points reproduced |
| **Pass rule** | Achieved ≥ 3 distinct leakage points (storage, network, compute) with evidence in `evidence/runs/` |
| **Fail rule** | < 3 distinct leakage points reproduced |
| **Evidence required** | Each leakage point must have ≥1 evidence file in `evidence/runs/` showing the measurement |

---

## KPI-2: Behavioural Differences Quantified

| Property | Value |
|----------|-------|
| **Metric unit** | Count of measurable variance categories with numeric delta |
| **Baseline** | 0 (no quantified differences before this project) |
| **Target** | ≥ 5 measurable variance categories (e.g., latency, IOPS, startup, CPU, memory) |
| **Pass rule** | ≥ 5 variance categories reported with numeric values and provider-level breakdown |
| **Fail rule** | < 5 variance categories, or categories reported without numeric values |
| **Evidence required** | Each variance category must cite a comparison_results row or evidence file with actual numbers |

---

## KPI-3: Deployment Success vs Behavioural Parity Score

| Property | Value |
|----------|-------|
| **Metric unit** | Percentage (0-100%) |
| **Definition** | (Deployments where all providers produce equivalent behavior) / (Total multi-provider deployments) × 100 |
| **Baseline** | Not measured |
| **Target** | Report the actual score (higher is better, but the goal is accurate measurement, not a high number) |
| **Pass rule** | Score is computed from ≥ 3 multi-provider deployment runs and reported with standard deviation |
| **Fail rule** | Score is hardcoded, not computed from evidence, or based on < 3 runs |
| **Evidence required** | Deployment traces in `evidence/runs/dev/` for each run; parity score computed in `evidence/kpi-results.md` |

---

## KPI-4: Repeatability (Across ≥3 Trials)

| Property | Value |
|----------|-------|
| **Metric unit** | Standard deviation or 95% confidence interval of KPI-1/2/3 across trials |
| **Baseline** | Not measured |
| **Target** | Report variability metric (std dev or CI) across ≥ 3 independent trial runs |
| **Pass rule** | ≥ 3 trials conducted; variability metric reported for each KPI |
| **Fail rule** | < 3 trials, or no variability/uncertainty metric reported |
| **Evidence required** | Each trial has its own evidence file in `evidence/runs/`; variability computed in `evidence/kpi-results.md` |

---

## KPI-5: Recovery Success Rate Under Fault Campaign

| Property | Value |
|----------|-------|
| **Metric unit** | Percentage (0-100%) |
| **Definition** | (Fault experiments where system recovered to desired state) / (Total fault experiments) × 100 |
| **Baseline** | Not measured |
| **Target** | ≥ 80% recovery success rate across all 5 negative test types |
| **Pass rule** | ≥ 80% recovery rate with evidence from `evidence/runs/acceptance/nt-*/` |
| **Fail rule** | < 80% recovery rate, or recovery claimed without evidence files |
| **Evidence required** | Each chaos experiment writes evidence to `evidence/runs/acceptance/`; results aggregated in `evidence/o5-acceptance-dossier.md` |

---

## Approved Deviations

_None as of frozen date._

<!-- Append any approved deviations below this line with date, rationale, and approver -->
