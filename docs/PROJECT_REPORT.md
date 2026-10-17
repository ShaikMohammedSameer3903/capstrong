# CLOUD-223: Technical Project Report
**Application Platform Abstraction Over Heterogeneous Cloud Infrastructure**

> **Note:** The full academic project report has been compiled under [`docs/reports/PROJECT_REPORT.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/reports/PROJECT_REPORT.md). A mirror summary is maintained below for quick reference.

* **Project Identifier:** CLOUD-223 / C2C-94
* **Department:** Computer Science & Engineering, KL University
* **Team:** Class Y23 CSE-2 | Team P-16 | Semester S-4
* **Authors:** Shaik Mohammed Sameer (2300030621), Pravallika Gubba (2300033432), Jeethu Kumar Ganchi (2300031651), Khammapati Ganesh (2300033359)
* **Project Guide:** Dr. N. Raghavendra Sai
* **Event:** SAMYAK-2026 Capstone Project Expo & Review

---

## Executive Summary

CLOUD-223 resolves the **"Portability Illusion"** in modern multi-cloud computing. While Infrastructure-as-Code (Terraform) and container orchestration (Kubernetes) can provision workloads across AWS, Azure, and GCP, they fail to evaluate runtime behavioral parity and failure recovery consistency.

CLOUD-223 couples a unified deployment abstraction layer with:
1. Standardized telemetry instrumentation (OpenTelemetry & Prometheus)
2. An infrastructure difference engine (`infraDiffEngine`) tracking 10 dimensions
3. Controlled fault injection (`chaosEngine`) testing 5 attack vectors
4. Automated recovery evaluation (`recoveryEngine`) measuring MTTD & MTTR
5. A tamper-evident cryptographic evidence ledger (`evidenceWriter` with SHA-256 manifests)

### Experimental Key Results
* **Evaluated Providers:** 3 (AWS EKS, Azure AKS, GCP GKE)
* **Empirical Leakage Points Identified:** 3 (Storage IOPS, Network Latency, Cold Start)
* **Variance Categories Quantified:** 5 Signals (Latency, Cold Start, Memory, CPU, Storage)
* **Static-Seed Repeatability Standard Deviation:** **0.0** (Deterministic benchmark consistency)
* **Recovery Rate under Chaos Attack:** **100% (5 out of 5 scenarios self-healed)**
* **Average Recovery MTTR:** **< 2.8 Seconds**
* **Aggregate Behavioral Parity Score:** **33.33%** (Empirically proves abstraction leakage under ±10% tolerance bounds)

For the complete technical breakdown, methodology, algorithms, and references, please review the complete report at [`docs/reports/PROJECT_REPORT.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/reports/PROJECT_REPORT.md).
