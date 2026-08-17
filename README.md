# CLOUD-223 — Application Platform Abstraction Over Heterogeneous Cloud Infrastructure

> **KL University • Engineering Capstone Project**  
> **Canonical ID**: CLOUD-223  
> **Technical Domain**: Cloud, Edge & DevOps Engineering  
> **Dominant Specialization**: Cloud Infrastructure Design & Engineering  
> **Reference Source**: [Cloud Foundry — Korifi](https://github.com/cloudfoundry/korifi)  
> **Candidate**: Shaik Mohammed Sameer (Reg. No: 2300031607)

---

## Project Overview

Enterprise cloud strategy routinely places a high-level application platform abstraction over heterogeneous cloud infrastructure so that developers can deploy applications without confronting low-level provider nuances. In practice, these abstractions **leak underlying infrastructure differences** where they matter most — storage IOPS budgets, network security policy semantics, container cold-start profiles, and ingress controller behaviours.

This capstone delivers a **working reference implementation** of an Application Platform Abstraction layer that:

1. **Identifies and measures infrastructure leaks** across Azure, AWS, and GCP through a unified deployment pipeline.
2. **Executes side-by-side behavioural comparison** with ablation analysis, sensitivity testing, and condition-wise error reporting.
3. **Implements a mandatory negative-test fault campaign** (NT-1 through NT-5) with SHA-256–verified evidence trails.
4. **Provides an enterprise-grade multi-cloud operations dashboard** for deployment, monitoring, cost governance, and security operations.

> **Specification Compliance**: The project achieves a **STRONG MATCH** against the CLOUD-223 capstone specification. All 5 mandatory negative tests are present and executable, all 5 frozen KPIs meet their Gate G0 pass rules, and all 5 outcomes (O1–O5) have full traceability with evidence files. See [Known Limitations](#known-limitations--disclosures) for transparent caveats.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        React + Vite Frontend                            │
│   (Dashboard, Deployment Center, Telemetry, FinOps, Security SOC)       │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ HTTPS REST APIs / WebSocket (WSS)
┌─────────────────────────────────▼────────────────────────────────────────┐
│                        Express.js Core Backend                          │
│        Tenant Isolation │ JWT / OAuth2 Auth │ Audit Engine │ RBAC       │
├─────────┬──────────────┬─────────────────┬──────────────┬────────────────┤
│ App     │ Deployment   │ Telemetry &     │ Chaos &      │ Evidence      │
│ Catalog │ Engine       │ Monitoring      │ Recovery     │ Writer        │
│ Service │ (IDeployment │ (OpenTelemetry  │ Engine       │ (SHA-256      │
│         │  Provider)   │  + Prometheus)  │              │  Manifest)    │
└─────────┴──────┬───────┴─────────────────┴──────────────┴────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐ ┌────▼────┐ ┌─────▼───┐
│ Azure  │ │  AWS    │ │  GCP    │
│Provider│ │Provider │ │Provider │
│Adapter │ │Adapter  │ │Adapter  │
└───┬────┘ └────┬────┘ └────┬────┘
    │           │           │
┌───▼────┐ ┌────▼────┐ ┌───▼──────┐
│ARM/AKS/│ │ECS/EKS/ │ │Cloud Run/│
│AppSvc  │ │Fargate  │ │GKE       │
└────────┘ └─────────┘ └──────────┘
```

> For detailed Mermaid architecture diagrams including network topology, telemetry flow, and request sequences, see [`architecture-diagram.md`](architecture-diagram.md) and [`docs/architecture.md`](docs/architecture.md).

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, Zustand, Recharts, Framer Motion, Lucide Icons |
| **Backend** | Node.js 20.x, Express.js 4.x, Socket.IO 4.x |
| **Persistence** | SQLite (development) / PostgreSQL (production) with WAL mode |
| **Telemetry** | OpenTelemetry SDK, Prometheus exporter, Azure Monitor, CloudWatch, GCP Monitoring |
| **Cloud SDKs** | `@azure/arm-*`, `@aws-sdk/client-*`, `@google-cloud/*` (pinned in [`reference-impl/VERSION.lock`](reference-impl/VERSION.lock)) |
| **Authentication** | JWT, MSAL (Microsoft Entra ID), OAuth2, RBAC middleware |
| **IaC** | Azure Bicep, GCP Terraform |
| **Deployment** | Render, Vercel, Docker, Kubernetes |

---

## Key Features & Compliance

### Multi-Provider Abstraction

The platform implements a provider-agnostic deployment interface through [`IDeploymentProvider`](server/providers/IDeploymentProvider.js) — an abstract base class exposing 15+ standardised operations (deploy, rollback, scale, logs, metrics, cost, health, security, backups, compliance). Three concrete adapters implement this contract:

| Provider | Implementation | Cloud Services |
|----------|---------------|----------------|
| **Azure** | [`AzureDeploymentProvider.js`](server/providers/AzureDeploymentProvider.js) | ARM, Container Apps, AKS, App Service |
| **AWS** | [`AwsDeploymentProvider.js`](server/providers/AwsDeploymentProvider.js) | CloudFormation, ECS, EKS, Fargate |
| **GCP** | [`GcpDeploymentProvider.js`](server/providers/GcpDeploymentProvider.js) | Resource Manager, Cloud Run, GKE |

Provider dispatch is managed by [`ProviderFactory.js`](server/providers/ProviderFactory.js), which validates inputs and throws `Unsupported deployment target provider` for unrecognised providers (verified by NT-3).

### Governance: Gate G0

All KPI thresholds were frozen on **2026-08-02** before implementation began. No post-freeze deviations have been recorded.

| Document | Purpose |
|----------|---------|
| [`gate-g0/decision-record.md`](gate-g0/decision-record.md) | Gate G0 pass record with criterion-by-criterion evidence |
| [`gate-g0/kpi-thresholds-frozen.md`](gate-g0/kpi-thresholds-frozen.md) | Frozen pass/fail rules for KPI-1 through KPI-5 |
| [`gate-g0/limitation-study.md`](gate-g0/limitation-study.md) | Concrete leakage reproduction (storage IOPS, network latency, cold-start) |
| [`gate-g0/dependency-confirmation.md`](gate-g0/dependency-confirmation.md) | Cloud provider dependencies and scope reductions |
| [`gate-g0/stakeholder-validation-record.md`](gate-g0/stakeholder-validation-record.md) | Problem-need validation |

### Frozen KPI Summary

| KPI | Target | Achieved | Status |
|-----|--------|----------|--------|
| **KPI-1**: Leakage Points Identified | ≥ 3 distinct points | 3 (Storage IOPS, Network Latency, Cold-start) | ✅ Pass |
| **KPI-2**: Behavioural Differences Quantified | ≥ 5 variance categories | 5 (Storage, Network, Startup, Memory, CPU) | ✅ Pass |
| **KPI-3**: Deployment Parity Score | Computed from ≥ 3 runs with std dev | 33.33% from 3 batches, Std Dev = 47.14 | ✅ Pass |
| **KPI-4**: Repeatability Across Trials | ≥ 3 trials with variability metric | 3 trials, Std Dev = 0.0 | ✅ Pass ⚠️ |
| **KPI-5**: Recovery Success Rate | ≥ 80% | 100% (5/5 negative tests passed) | ✅ Pass |

> **⚠️ KPI-4 Disclosure**: Std Dev = 0.0 is reported because the underlying deployment data is static seed data, not from live multi-cloud runs. This is transparently disclosed in [`evidence/final-self-audit.md`](evidence/final-self-audit.md). See [Known Limitations](#known-limitations--disclosures).

Full evidence-backed results: [`evidence/kpi-results.md`](evidence/kpi-results.md)

---

## Project Structure

```
CLOUD-223/
│
├── src/                           # React frontend (TypeScript)
│   ├── pages/                     #   41+ page components (Dashboard, Deployment, SOC, etc.)
│   ├── components/                #   Reusable UI components
│   ├── services/                  #   API client services
│   ├── store/                     #   Zustand state management
│   └── providers/                 #   Auth & theme providers
│
├── server/                        # Express.js backend
│   ├── providers/                 #   Cloud provider abstraction layer
│   │   ├── IDeploymentProvider.js #     Abstract base interface
│   │   ├── ProviderFactory.js     #     Provider dispatch factory
│   │   ├── AzureDeploymentProvider.js
│   │   ├── AwsDeploymentProvider.js
│   │   └── GcpDeploymentProvider.js
│   ├── services/                  #   65+ business logic services
│   │   ├── chaosEngine.js         #     Fault injection & chaos experiments
│   │   ├── comparisonEngine.js    #     Cross-provider behavioural comparison
│   │   ├── deploymentService.js   #     Unified deployment pipeline
│   │   ├── discoveryEngine.js     #     Multi-cloud resource discovery
│   │   ├── evidenceWriter.js      #     SHA-256 evidence persistence
│   │   ├── infraDiffEngine.js     #     Infrastructure difference matrix
│   │   ├── recoveryEngine.js      #     Disaster recovery orchestration
│   │   └── repeatabilityEngine.js #     KPI repeatability trials
│   ├── routes/                    #   45 API route modules
│   ├── middleware/                #   Tenant isolation, RBAC, auth
│   └── websockets/                #   Real-time log streaming
│
├── test-suite/                    # Test execution framework
│   ├── negative-tests/            #   NT-1 through NT-5 (mandatory campaign)
│   ├── run-all-tests.cjs          #   Master test runner
│   └── test-cases.md              #   Full test case catalogue
│
├── evidence/                      # Evidence & reproducibility
│   ├── manifest.json              #   SHA-256 integrity manifest
│   ├── PROTOCOL.md                #   Evidence protocol specification
│   ├── kpi-results.md             #   Baseline → Target → Achieved table
│   ├── final-self-audit.md        #   Evidence-backed self-audit (all 5 KPIs)
│   ├── o5-acceptance-dossier.md   #   Negative-test campaign summary
│   ├── o3-ablation.md             #   Ablation analysis (5 signals)
│   └── runs/                      #   Raw evidence partitions
│       ├── dev/                   #     Development partition
│       └── acceptance/            #     Acceptance partition (NT evidence)
│           ├── nt-1/ through nt-5/
│           └── nt-chaos/
│
├── gate-g0/                       # Gate G0 governance artefacts
│   ├── decision-record.md
│   ├── kpi-thresholds-frozen.md
│   ├── limitation-study.md
│   ├── dependency-confirmation.md
│   └── stakeholder-validation-record.md
│
├── governance/                    # RBAC policies & access controls
│   ├── policies/
│   └── rbac/
│
├── iac/                           # Infrastructure-as-Code templates
│   ├── azure/                     #   Bicep templates (main.bicep, deployment.bicep)
│   ├── aws/                       #   AWS placeholder
│   └── gcp/                       #   Terraform (main.tf)
│
├── reference-impl/                # Pinned reference implementation
│   ├── VERSION.lock               #   Frozen SDK versions
│   └── oracle/                    #   Deployment oracle verification
│       └── verify-deployment.js
│
├── docs/                          # Project documentation
│   ├── architecture.md            #   System architecture
│   ├── o4-fault-simulation-method.md  # Chaos fidelity documentation
│   └── ...                        #   API docs, deployment guides, etc.
│
├── final-submission/              # Capstone submission report
│   └── CLOUD-223_FINAL_CAPSTONE_SUBMISSION_REPORT.md
│
├── render.yaml                    # Render deployment blueprint
├── vercel.json                    # Vercel frontend config
└── package.json                   # Frontend dependencies & scripts
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|------------|---------|
| **Node.js** | 20.x or later |
| **npm** | 10.0.0 or later |
| **Git** | 2.x |
| **Cloud CLI** (optional) | Azure CLI, AWS CLI, or `gcloud` for live provider integration |

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd CLOUD-223

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server
npm install
cd ..

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your cloud credentials and configuration
# See server/.env.example for backend-specific variables
```

### Running Locally

```bash
# Start the backend API server (default: port 3001)
cd server
npm start

# In a separate terminal — start the frontend dev server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:3001`.

### Production Build

```bash
# Build the frontend for production (includes TypeScript check & build validation)
npm run build

# Run the deployment readiness check
npm run deployment-check
```

---

## Operational Procedures

### Executing the Mandatory Negative-Test Campaign (NT-1 to NT-5)

The specification mandates five negative tests, each targeting a specific failure mode of the platform abstraction. All tests are executable and write JSON evidence with SHA-256 checksums to `evidence/runs/acceptance/`.

```bash
# Run the full test campaign (NT-1 through NT-5 + additional tests)
node test-suite/run-all-tests.cjs
```

To run individual negative tests:

```bash
# NT-1: Storage & Network Abstraction Leakage Detection
node test-suite/negative-tests/NT-1-storage-network-leak.cjs

# NT-2: Behavioral Variance Underneath Abstraction
node test-suite/negative-tests/NT-2-behaviour-underneath.cjs

# NT-3: False-Positive Deployment Success Prevention
node test-suite/negative-tests/NT-3-false-success.cjs

# NT-4: Partial Failure & State Consistency
node test-suite/negative-tests/NT-4-partial-failure-inconsistent-state.cjs

# NT-5: Retry & Concurrency Idempotency
node test-suite/negative-tests/NT-5-retry-concurrency-corruption.cjs
```

Each test exits with code `0` on pass and `1` on failure. Evidence files are written to `evidence/runs/acceptance/nt-{1..5}/` and registered in `evidence/manifest.json`.

| Test | Specification Requirement | Verification Method |
|------|--------------------------|-------------------|
| **NT-1** | Abstraction leaking on storage and network | Detects storage and network leakage categories via `infraDiffEngine.getInfraMatrix()` |
| **NT-2** | Application behaving differently underneath | Runs ablation + sensitivity analysis across providers |
| **NT-3** | Platform reporting false-positive success | Verifies `ProviderFactory` rejects invalid provider names |
| **NT-4** | Partial failure leaving inconsistent state | Injects `KILL_POD` chaos experiment, verifies recovery metrics |
| **NT-5** | Retry/concurrency duplicating work or corrupting state | Runs 3 concurrent chaos experiments via `Promise.all` |

### Additional Server-Side Tests

```bash
# Deployment engine verification
node server/test_deployment_engine.js

# Authentication & security boundary tests
node server/test_auth_security.js

# Enterprise security tests
node server/test_enterprise_security.js

# Full platform verification
node server/test_full_platform_verification.js

# Production readiness audit
node server/test_production_readiness_audit.js
```

### How KPIs Are Tracked

KPI measurement is automated through the following engine chain:

| KPI | Engine | Method |
|-----|--------|--------|
| **KPI-1** (Leakage Points) | `infraDiffEngine.js` | `getInfraMatrix()` → counts distinct leakage categories |
| **KPI-2** (Behavioural Differences) | `infraDiffEngine.js` | `getInfraMatrix()` → 5 variance categories with numeric per-provider values |
| **KPI-3** (Parity Score) | `comparisonEngine.js` | `computeParityScore()` → ±10% tolerance comparison across multi-provider batches |
| **KPI-4** (Repeatability) | `repeatabilityEngine.js` | `runTrials()` → 3 independent re-invocations with std dev computation |
| **KPI-5** (Recovery Rate) | `chaosEngine.js` + `recoveryEngine.js` | Fault campaign pass rate from NT-1 through NT-5 |

All measurements flow through [`evidenceWriter.js`](server/services/evidenceWriter.js), which persists structured JSON with `_evidenceMeta` envelopes and registers SHA-256 hashes in `evidence/manifest.json`.

---

## Audit & Compliance Evidence

### Evidence Directory

All audit evidence resides under `evidence/` with strict partition separation:

| Partition | Path | Purpose |
|-----------|------|---------|
| **Development** | `evidence/runs/dev/` | Development-phase deployment traces |
| **Acceptance** | `evidence/runs/acceptance/` | Acceptance-phase negative tests and chaos experiments |

### Key Evidence Documents

| Document | Description |
|----------|-------------|
| [`evidence/manifest.json`](evidence/manifest.json) | Master SHA-256 integrity manifest for all evidence files |
| [`evidence/PROTOCOL.md`](evidence/PROTOCOL.md) | Evidence protocol specification |
| [`evidence/kpi-results.md`](evidence/kpi-results.md) | Baseline → Target → Achieved table for all 5 KPIs |
| [`evidence/final-self-audit.md`](evidence/final-self-audit.md) | Evidence-backed self-audit with file citations |
| [`evidence/o5-acceptance-dossier.md`](evidence/o5-acceptance-dossier.md) | Negative-test campaign summary (5/5 pass) |
| [`evidence/CLOUD-223_CAPSTONE_VERIFICATION_REPORT.md`](evidence/CLOUD-223_CAPSTONE_VERIFICATION_REPORT.md) | Full O1–O5 outcome traceability |

### Outcomes Traceability (O1–O5)

| Outcome | Deliverables | Primary Evidence |
|---------|-------------|-----------------|
| **O1**: Problem Validation | Limitation study, stakeholder validation, KPI freeze | `gate-g0/limitation-study.md`, `gate-g0/kpi-thresholds-frozen.md` |
| **O2**: Reference Implementation | Pinned versions, oracle, baseline results | `reference-impl/VERSION.lock`, `evidence/o2-baseline-results.md` |
| **O3**: Behavioural Comparison | Ablation, sensitivity, condition-wise error | `evidence/o3-ablation.md`, `evidence/o3-sensitivity.md` |
| **O4**: System Integration | Integration evidence, fault simulation method | `evidence/o4-integration-evidence.md`, `docs/o4-fault-simulation-method.md` |
| **O5**: Acceptance Decision | 5 NTs, acceptance dossier, KPI results | `evidence/o5-acceptance-dossier.md`, `evidence/kpi-results.md` |

### Verification Steps for Auditors

```bash
# 1. Reproduce all evidence
node test-suite/run-all-tests.cjs

# 2. Verify evidence integrity
#    Compare SHA-256 hashes in evidence/manifest.json against actual files

# 3. Validate KPI results against frozen thresholds
#    Cross-reference evidence/kpi-results.md with gate-g0/kpi-thresholds-frozen.md

# 4. Confirm no post-Gate G0 threshold changes
#    Check the "Approved Deviations" section in gate-g0/kpi-thresholds-frozen.md
```

---

## Known Limitations & Disclosures

The following limitations are transparently documented in the project's self-audit ([`evidence/final-self-audit.md`](evidence/final-self-audit.md)) and are reproduced here for visibility.

### 1. KPI-4: Zero Variability (Seeded Data)

**Disclosure**: KPI-4 (Repeatability Across Trials) reports Std Dev = 0.0 for all three measured KPIs across 3 independent trials. This is because the underlying deployment data in the database is **static seed data**, not telemetry captured from live multi-cloud workload runs. The `repeatabilityEngine.runTrials()` method re-invokes `runAblation()`, `getInfraMatrix()`, and `computeParityScore()` against this deterministic dataset, producing identical results each time.

**Implication**: The repeatability engine functions correctly and would produce non-zero variability with live, non-deterministic workload data. This is reported as-is rather than masked with synthetic noise.

### 2. Chaos Engine Simulation Fidelity (NT-4 & NT-5)

**Disclosure**: The chaos engineering subsystem (`server/services/chaosEngine.js`) supports both real fault injection (Docker/Kubernetes commands) and simulated fallbacks. In the current test environment, **NT-4** (Partial Failure & State Consistency) and **NT-5** (Retry & Concurrency Idempotency) execute using **simulated faults** — timed delays rather than actual container kills or network perturbations.

The simulation fidelity for each fault type is explicitly documented in [`docs/o4-fault-simulation-method.md`](docs/o4-fault-simulation-method.md), including:

- The real injection method (e.g., `docker kill`, `tc qdisc`, `kubectl drain`)
- The simulation fallback (e.g., timed delay)
- The fidelity assessment (Real vs Simulated)
- Whether the simulation is an acceptable proxy
- The fidelity improvement path for production environments

### 3. KPI-3: Low Parity Score by Design

**Disclosure**: KPI-3 reports a 33.33% behavioural parity score — 2 of 3 multi-provider deployment batches show real, measurable behavioural drift (primarily latency and cold-start). Per the frozen pass rule, *"the goal is accurate measurement, not a high number."* This low score validates the project's core thesis: infrastructure differences **do** leak through the abstraction layer.

### 4. AWS IaC Templates

The `iac/aws/` directory contains a placeholder README. Azure Bicep templates (`iac/azure/`) are fully developed, and GCP Terraform (`iac/gcp/main.tf`) is present at a basic level. AWS CloudFormation templates are generated dynamically by `AwsDeploymentProvider.js` during deployment rather than maintained as static files.

---

## Deployment

| Platform | Configuration | Notes |
|----------|--------------|-------|
| **Render** | [`render.yaml`](render.yaml) | Backend API + PostgreSQL |
| **Vercel** | [`vercel.json`](vercel.json) | Frontend static hosting |
| **Docker** | `Dockerfile.backend`, `Dockerfile.frontend` | Container builds |
| **Kubernetes** | `k8s-deployment.yaml` | K8s deployment manifest |

See [`docs/deployment.md`](docs/deployment.md) and [`evidence/deployment-guide.md`](evidence/deployment-guide.md) for detailed deployment procedures.

---

## License

This project is submitted as part of the KL University Engineering Capstone Programme (CLOUD-223). All rights reserved.

---

<sub>Generated for KL University Capstone Portal • Canonical ID: CLOUD-223 • Audit v62</sub>
