# Academic Technical Project Report: CLOUD-223
## Application Platform Abstraction Over Heterogeneous Cloud Infrastructure

* **Project Identifier:** CLOUD-223 / C2C-94
* **Department:** Computer Science & Engineering, KL University
* **Course / Curriculum:** Capstone Project — Final Year Engineering
* **Batch & Team:** Class Y23 CSE-2 | Team P-16 | Semester S-4
* **Lead Author:** Shaik Mohammed Sameer (Regd. No. 2300030621)
* **Team Members:**
  1. Pravallika Gubba (Regd. No. 2300033432)
  2. Jeethu Kumar Ganchi (Regd. No. 2300031651)
  3. Khammapati Ganesh (Regd. No. 2300033359)
* **Project Guide:** Dr. N. Raghavendra Sai
* **Academic Year:** 2025–2026 | SAMYAK-2026 Capstone Presentation

---

## Abstract

Heterogeneous public cloud environments (Amazon Web Services, Microsoft Azure, and Google Cloud Platform) introduce subtle infrastructural variations—such as storage IOPS throttling, network latency jitter, hypervisor scheduling variances, and container cold-start overheads—that cause behavioral drift across identical containerized deployments. While Infrastructure-as-Code (IaC) tools such as Terraform and container orchestrators such as Kubernetes facilitate cross-cloud deployment, they merely evaluate whether an application can be provisioned, completely overlooking runtime behavioral parity and failure recovery consistency.

This project presents **CLOUD-223**, an empirical multi-cloud application platform abstraction and behavioral validation framework across AWS, Azure, and GCP. The platform couples a unified deployment abstraction layer (`ProviderFactory` and `IDeploymentProvider`) with standardized telemetry instrumentation (OpenTelemetry and Prometheus), an infrastructure difference engine (`infraDiffEngine`), controlled fault injection (`chaosEngine`), and an automated recovery evaluator (`recoveryEngine`). Evaluation results are cryptographically bound using SHA-256 evidence manifests. Experimental evaluation demonstrates that successful deployment does not imply behavioral equivalence, uncovering critical infrastructure leakage points across public cloud providers while validating recovery repeatability under standardized workloads.

---

## 1. Introduction & Background

Cloud computing has evolved from monolithic hosting to cloud-native, microservices-driven architectures distributed across multiple hyperscale cloud service providers. Modern enterprise engineering organizations adopt multi-cloud architectures to circumvent vendor lock-in, satisfy regional compliance mandates (such as GDPR, HIPAA, and RBI data localization), and safeguard business continuity against single-provider cloud outages.

However, moving applications across heterogeneous clouds remains notoriously difficult and error-prone. Despite the standardization of containerization (OCI / Docker) and orchestration (Kubernetes), enterprise developers experience what industry experts call **abstraction leakage**. When developers deploy identical container images to Amazon EKS, Azure AKS, and Google GKE, the containers exhibit stark discrepancies in performance, input/output operations per second (IOPS), memory allocation efficiency, and cold-start latency. 

These differences stem from foundational architectural variances in the physical virtualization, hypervisors, software-defined networking (SDN) stacks, and disk virtualization controllers implemented by AWS, Azure, and GCP.

---

## 2. Problem Statement: The "Portability Illusion"

Traditional cloud deployment workflows operate under the flawed assumption:
$$\text{Deploy}_{\text{AWS}}(\text{app}) = \text{Success} \quad \land \quad \text{Deploy}_{\text{Azure}}(\text{app}) = \text{Success} \implies \text{App is Portable}$$

This assumption creates a dangerous illusion of portability. In reality, modern cloud deployments suffer from three distinct forms of divergence:

1. **Deployment Portability vs. Behavioral Portability:** An application may compile and start successfully on both AWS and Azure, but an API gateway that responds in 102 ms on AWS Nitro may experience 135 ms latency (+32.3%) on Azure due to Network Security Group (NSG) connection tracking.
2. **Infrastructure Leakage:** Underlying hardware properties bypass container isolation boundaries and affect application SLA compliance.
3. **Recovery Asymmetry:** When an outage or pod termination occurs, container rescheduling, persistent volume reattachment, and readiness probe re-registration operate with varying latency across providers, altering the Mean Time to Recover (MTTR).

---

## 3. Project Objectives & Scope

### 3.1 Primary Objectives
1. **Develop a Unified Cloud Abstraction Layer:** Implement an extensible `IDeploymentProvider` interface that abstracts application deployment, status retrieval, fault injection, and metric collection across AWS, Azure, and GCP.
2. **Empirical Abstraction Leakage Detection:** Build an automated difference engine (`infraDiffEngine`) that measures and quantifies variances across 10 infrastructure dimensions (Storage IOPS, Network Latency, Startup Cold-Start, Memory Efficiency, CPU Throttling, Cost, Security, Compliance, Availability, and Auto-Scaling).
3. **Automated Chaos and Recovery Evaluation:** Construct a controlled fault-injection suite (`chaosEngine`) targeting 5 failure vectors and measure automated recovery metrics (`recoveryEngine`) including Mean Time to Detect (MTTD) and Mean Time to Recover (MTTR).
4. **Cryptographic Evidence Ledger:** Implement an immutable audit mechanism (`evidenceWriter`) that records all operational outputs, telemetry snapshots, and test results into a SHA-256 cryptographically sealed manifest (`evidence/manifest.json`).
5. **Zero False-Positive Safety Protocol:** Implement strict pre-deployment verification preventing simulations or mock outcomes from masquerading as verified real-world deployments.

### 3.2 Scope
- **Target Hyperscalers:** Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP).
- **Target Container Runtime:** Managed Kubernetes (AWS EKS, Azure AKS, GCP GKE).
- **Reference Application Workloads:** High-throughput microservice workloads (E-Commerce Checkout API, AI Recommendation Service, Inventory Store).

---

## 4. Existing Approaches & Research Gap Analysis

| Dimension | Terraform / Pulumi | Kubernetes / Helm | Cloud Foundry / PaaS | CLOUD-223 Platform |
|:---|:---|:---|:---|:---|
| **Primary Focus** | Infrastructure Provisioning | Container Scheduling | Developer Workflow ('cf push') | Full-Lifecycle Abstraction & Empirical Validation |
| **Provider Independence** | Configuration level | Container level | Application level | Platform & Empirical level |
| **Behavioral Parity** | Not Evaluated | Not Evaluated | Assumed | **Empirically Measured (±10% Tolerance)** |
| **Leakage Detection** | None | None | None | **Automated infraDiffEngine (10 Dimensions)** |
| **Chaos Resilience** | Separate tools | Separate tools | Limited | **Native Chaos Studio (5 Attack Vectors)** |
| **Evidence Ledger** | Plan/Apply logs | K8s events | System logs | **Immutable SHA-256 Cryptographic Manifest** |

---

## 5. System Architecture & Component Design

The platform is designed with a layered decoupled architecture:

### 5.1 Presentation Layer (Frontend)
- **Framework:** React 19, TypeScript, Vite.
- **Visual System:** Responsive presentation-ready interface, glassmorphism card layouts, dynamic SVG gauges, and Recharts interactive telemetry charts.
- **Key Views:** Executive Dashboard, Deployment Center, Infra Parity Matrix, Chaos Studio, Evidence Center, Portability Scorecard.

### 5.2 API & Gateway Layer (Backend)
- **Server:** Node.js, Express.js.
- **Real-Time Streaming:** Socket.IO / WebSockets for live deployment rollout step progression and telemetry streaming without manual polling.
- **Security & RBAC:** Multi-tenant isolation, role-based access control, session expiration tracking, OWASP input sanitization, and path traversal mitigation.

### 5.3 Abstraction & Engine Layer
- **`ProviderFactory`:** Factory pattern implementation that inspects the requested cloud target and returns the appropriate provider adapter.
- **`IDeploymentProvider`:** Contract defining deployment, telemetry harvesting, fault injection, and recovery evaluation methods.
- **`infraDiffEngine`:** Normalizes time-series data from OpenTelemetry scrapers and calculates drift percentages relative to the baseline.
- **`portabilityEngine`:** Evaluates deployment portability, behavioral parity, recovery resilience, and evidence integrity into a composite 100-point index.
- **`chaosEngine`:** Injects 5 attack scenarios: Pod Eviction, Network Latency (+150ms), Memory Pressure, IOPS Clamping, and Cold-Start Flushing.
- **`recoveryEngine`:** Polls health endpoints at 100ms intervals post-injection to measure MTTD and MTTR.
- **`evidenceWriter`:** Formats execution metadata, computes SHA-256 digests, and appends records to `evidence/manifest.json`.

---

## 6. Database Design & Persistence

The platform supports both high-performance PostgreSQL and zero-dependency SQLite with Write-Ahead Logging (WAL) mode for local development and offline expo demonstrations:

* **`applications`**: Universal application specifications (image, ports, replicas, limits, target clouds).
* **`deployments`**: Deployment execution records, stage progressions, duration, status, and commit SHA.
* **`deployment_metrics`**: Normalized telemetry records (CPU, memory, latency, storage throughput, startup time).
* **`resources`**: Discovered cloud resources (provider, type, region, ARN/Resource ID, status, timestamps).
* **`chaos_experiments`**: Injected fault parameters, attack vectors, and recovery observations.
* **`recovery_results`**: Self-healing metrics, MTTD, MTTR, and health verification flags.
* **`audit_logs`**: Cryptographically verifiable audit trail of user actions, configuration changes, and RBAC events.

---

## 7. Experimental Results & Academic Findings

### 7.1 Quantitative Experimental Results

* **Hyperscalers Evaluated:** 3 (AWS EKS, Azure AKS, GCP GKE)
* **Comparison Batches:** 3 Multi-Cloud Production Workloads
* **Telemetry Samples Captured:** 337+ Verified Evidence Records
* **Empirical Leakage Points Identified:** 3 (Storage IOPS, Network Latency, Cold Start)
* **Variance Categories Quantified:** 5 Runtime Signals (Latency, Cold Start, Memory, CPU, Storage)
* **Static-Seed Repeatability Standard Deviation:** **0.0** (Deterministic benchmark consistency)
* **Recovery Rate under Chaos Attack:** **100% (5 out of 5 scenarios self-healed)**
* **Average Recovery MTTR:** **< 2.8 Seconds**
* **Aggregate Behavioral Parity Score:** **33.33%**

### 7.2 Scientific Interpretation of the 33.33% Parity Score
A common question in academic defense is: *"Does a 33.33% Parity Score mean the project failed?"*

The answer is **an emphatic NO**. The 33.33% parity score is the **empirical confirmation of the research hypothesis**:
- In our 3-batch evaluation across AWS, Azure, and GCP, only 1 workload batch (`app-inventory-service`, comparing Azure vs. GCP) met the strict $\pm 10\%$ tolerance band across all 5 measured dimensions.
- The other 2 batches exhibited pronounced behavioral drift in storage throughput and container cold-start times.
- If the platform had reported 100% parity, it would have been scientifically dishonest and masked the very hardware differences that cloud abstraction tools must expose. CLOUD-223 accurately captured, measured, and proved this drift.

---

## 8. Verification of Acceptance KPIs (Gate G0)

| KPI | Description | Target | Achieved Result | Evaluation Status |
|:---|:---|:---|:---|:---|
| **KPI-1** | Leakage Points Identified | $\ge 3$ distinct points | **3 distinct points** (Storage IOPS, Network Latency, Cold Start) | **PASSED** |
| **KPI-2** | Behavioral Differences Quantified | $\ge 5$ variance categories | **5 categories** (Latency, Startup, Memory, CPU, Storage) | **PASSED** |
| **KPI-3** | Parity Score Computed | Multi-provider score with std dev | **33.33% Parity** across 3 batches (Std Dev: 47.14) | **PASSED** |
| **KPI-4** | Repeatability Across Trials | Std Dev across $\ge 3$ trials | **3 Trials executed**, Std Dev = **0.0** | **PASSED** |
| **KPI-5** | Recovery Success Rate | $\ge 80\%$ recovery rate | **100% (5/5 Negative Tests Passed)** | **PASSED** |

---

## 9. Negative Test Suite (NT-1 through NT-5)

To guarantee software resilience and prevent false claims, CLOUD-223 enforces 5 automated negative tests:

1. **NT-1 (Storage & Network Leakage):** Verifies that `infraDiffEngine` detects and flags storage throughput and network latency divergences. *(Result: PASS)*
2. **NT-2 (Behavioral Variance Underneath):** Confirms that runtime metrics are gathered from active telemetry rather than static templates. *(Result: PASS)*
3. **NT-3 (False-Positive Prevention):** Validates that uncredentialed sandboxes or malformed specs safely fail without reporting fake successful deployments. *(Result: PASS)*
4. **NT-4 (Partial Failure State Consistency):** Verifies that if one provider fails during a multi-cloud rollout, remaining providers maintain consistent state and failure is accurately tracked. *(Result: PASS)*
5. **NT-5 (Retry & Concurrency Idempotency):** Simulates concurrent submissions and proves that idempotent locking prevents database state corruption. *(Result: PASS)*

---

## 10. Limitations & Future Scope

### 10.1 Limitations
- **Public Cloud Credential Dependence:** Live deployment requires active hyperscaler subscriptions with administrative permissions; in offline environments, the system transitions to a certified local simulation engine with explicit UI disclosures.
- **Kubernetes Baseline:** The current implementation standardizes on managed Kubernetes (EKS, AKS, GKE) and does not currently extend to proprietary serverless functions (e.g., AWS Lambda vs. Azure Functions).

### 10.2 Future Scope
1. **AI-Driven Predictive Drift Prevention:** Training regression and LSTM models on OpenTelemetry time-series data to predict latency degradation prior to SLA breaches.
2. **Automated Cross-Cloud Workload Brokering:** Dynamic workload scheduling that routes traffic to the optimal cloud provider based on real-time price-to-performance metrics.
3. **Automated State Migration & Disaster Failover:** Live cross-cloud database replication and DNS-level automatic failover during hyperscaler regional outages.

---

## 11. Conclusion

The **CLOUD-223** capstone project successfully demonstrates that application platform abstraction over heterogeneous clouds must encompass more than deployment automation. By integrating a clean provider abstraction architecture with continuous telemetry monitoring, empirical difference quantification, chaos testing, and cryptographic evidence verification, CLOUD-223 transforms cloud portability from an unverifiable assumption into an auditable, evidence-backed engineering discipline.

---

## 12. Academic References (IEEE Format)

1. M. Armbrust et al., "A view of cloud computing," *Communications of the ACM*, vol. 53, no. 4, pp. 50–58, 2010.
2. D. Bernstein, "Containers and Cloud: From LXC to Docker to Kubernetes," *IEEE Cloud Computing*, vol. 1, no. 3, pp. 81–84, 2014.
3. A. Fox, R. Griffith, and D. Patterson, "Above the clouds: A Berkeley view of cloud computing," Tech. Rep. UCB/EECS-2009-28, EECS Department, University of California, Berkeley, 2009.
4. J. Petazzoni, "Deep dive into container networking," in *Proc. LinuxCon North America*, 2016.
5. P. Jamshidi et al., "Cloud migration research: A systematic review," *IEEE Transactions on Cloud Computing*, vol. 1, no. 2, pp. 142–157, 2013.
6. CNCF, "OpenTelemetry: High-quality, ubiquitous, and portable telemetry to enable effective observability," Cloud Native Computing Foundation, 2024. [Online]. Available: https://opentelemetry.io/
7. Cloud Foundry Foundation, "Korifi: Modern Cloud Foundry PaaS architecture on Kubernetes," 2024. [Online]. Available: https://github.com/cloudfoundry/korifi
