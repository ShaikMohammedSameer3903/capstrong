# SAMYAK-2026 Capstone Final Submission Checklist

* **Project Identifier:** CLOUD-223 / C2C-94
* **Project Title:** Application Platform Abstraction Over Heterogeneous Cloud Infrastructure
* **Department:** Computer Science & Engineering, KL University
* **Team:** Class Y23 CSE-2 | Team P-16 | Semester S-4
* **Team Lead:** Shaik Mohammed Sameer (2300030621)
* **Team Members:** Pravallika Gubba (2300033432), Jeethu Kumar Ganchi (2300031651), Khammapati Ganesh (2300033359)
* **Faculty Guide:** Dr. N. Raghavendra Sai
* **Target Events:** SAMYAK-2026 Poster Presentation, Research Paper Presentation, and Project Expo

---

## Deliverables & Readiness Matrix

| Category | Deliverable Item | File Location | Status | Verified By |
|:---|:---|:---|:---:|:---|
| **Event 1: Poster** | A3 Print-Ready Poster PDF | [`docs/poster/samyak_2026_capstone_poster.pdf`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/poster/samyak_2026_capstone_poster.pdf) | **READY (100%)** | Verified A3 420x297mm Vector |
| **Event 1: Poster** | A3 Poster Editable Source HTML | [`docs/poster/samyak_2026_capstone_poster.html`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/poster/samyak_2026_capstone_poster.html) | **READY (100%)** | Clean responsive grid + SVG |
| **Event 1: Poster** | Poster Print & Oral Pitch Guide | [`docs/poster/POSTER_GUIDE.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/poster/POSTER_GUIDE.md) | **READY (100%)** | 2-min pitch + print specs |
| **Event 2: Paper** | Paper Validation & Consistency Report | [`docs/RESEARCH_PAPER_VALIDATION.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/RESEARCH_PAPER_VALIDATION.md) | **READY (100%)** | Section-by-section audit |
| **Event 2: Paper** | Master Academic Defense & Spec | [`docs/CLOUD223_MASTER_PROJECT_EXPLANATION.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/CLOUD223_MASTER_PROJECT_EXPLANATION.md) | **READY (100%)** | IEEE abstract, math models |
| **Event 2: Paper** | Technical Project Report | [`docs/reports/PROJECT_REPORT.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/reports/PROJECT_REPORT.md) | **READY (100%)** | Comprehensive academic report |
| **Event 3: Expo** | 10-Slide Editable Presentation | [`docs/presentation/SAMYAK_2026_EXPO_PRESENTATION.pptx`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/presentation/SAMYAK_2026_EXPO_PRESENTATION.pptx) | **READY (100%)** | Python-pptx widescreen 16:9 |
| **Event 3: Expo** | Speaker Script & Walkthrough Pitch | [`docs/presentation/SPEAKER_SCRIPT.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/presentation/SPEAKER_SCRIPT.md) | **READY (100%)** | Slide-by-slide 5-7 min pitch |
| **Event 3: Expo** | Evaluator FAQ & Defense Guide | [`docs/presentation/EVALUATOR_FAQ.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/presentation/EVALUATOR_FAQ.md) | **READY (100%)** | Top anticipated questions |
| **Event 3: Expo** | Step-by-Step Prototype Demo Guide | [`docs/demo/DEMONSTRATION_GUIDE.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/demo/DEMONSTRATION_GUIDE.md) | **READY (100%)** | Exact screen sequence |
| **Event 3: Expo** | 50 Comprehensive Viva Q&A | [`docs/viva/VIVA_QUESTIONS.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/viva/VIVA_QUESTIONS.md) | **READY (100%)** | 10 technical categories |
| **Engineering** | System Architecture & Diagrams | [`docs/architecture/ARCHITECTURE.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/architecture/ARCHITECTURE.md) | **READY (100%)** | 4 Mermaid diagrams |
| **Engineering** | REST API & WebSocket Documentation | [`docs/API_DOCUMENTATION.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/API_DOCUMENTATION.md) | **READY (100%)** | OpenAPI 3.0.0 specs |
| **Engineering** | Comprehensive Test Report | [`docs/testing/TEST_REPORT.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/testing/TEST_REPORT.md) | **READY (100%)** | NT-1 to NT-5 verified PASS |
| **Engineering** | Cryptographic Evidence Manifest | [`evidence/manifest.json`](file:///d:/Downloads/capstrong-main/capstrong-main/evidence/manifest.json) | **READY (100%)** | 337 SHA-256 artifacts |
| **Engineering** | Production & Local Deployment Guide | [`docs/DEPLOYMENT_GUIDE.md`](file:///d:/Downloads/capstrong-main/capstrong-main/docs/DEPLOYMENT_GUIDE.md) | **READY (100%)** | Local, Docker, K8s, Atlas |
| **Engineering** | Master Repository README | [`README.md`](file:///d:/Downloads/capstrong-main/capstrong-main/README.md) | **READY (100%)** | Setup, stack, architecture |

---

## Hardware & Demonstration Checklist

- [x] Laptop running Node.js (v20+), npm, and modern browser (Edge/Chrome).
- [x] Frontend compiled clean (`tsc -b && vite build` succeeded).
- [x] Backend dependencies installed and verified (including `@azure/monitor-query`, `mongoose`, `mongodb`).
- [x] Dual-engine database verified (SQLite WAL mode + MongoDB Atlas cluster).
- [x] Zero-Trust credentials, Google OAuth, and Azure credentials configured in `.env`.
- [x] Negative tests verified (`node test-suite/run-all-tests.cjs` 5/5 PASSED).
- [x] Offline fallback ready (SQLite static-seed determinism SD = 0.0).
- [x] Backup copy of all presentation slides, A3 poster, and reports in `docs/`.
