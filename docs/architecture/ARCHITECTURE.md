# CLOUD-223: System Architecture & Design Specification
**Application Platform Abstraction Over Heterogeneous Cloud Infrastructure**

* **Project Identifier:** CLOUD-223 / C2C-94
* **Academic Institution:** KL University, Department of Computer Science & Engineering
* **Author Team:** Shaik Mohammed Sameer (2300030621), Pravallika Gubba (2300033432), Jeethu Kumar Ganchi (2300031651), Khammapati Ganesh (2300033359)
* **Faculty Guide:** Dr. N. Raghavendra Sai
* **Event Readiness:** SAMYAK-2026 Capstone Expo & Academic Review

---

## 1. Architectural Philosophy & Problem Definition

Traditional multi-cloud strategies operate on the flawed assumption:
$$\text{Deploy}_{\text{AWS}}(\text{app}) = \text{OK} \quad \land \quad \text{Deploy}_{\text{Azure}}(\text{app}) = \text{OK} \quad \land \quad \text{Deploy}_{\text{GCP}}(\text{app}) = \text{OK} \implies \text{App is Portable}$$

In reality, **Deployment Portability $\neq$ Behavioral Portability $\neq$ Recovery Portability**:
1. **Abstraction Leakage:** Low-level virtualization primitives (AWS Nitro hypervisor vs. Azure Hyper-V vs. GCP KVM, virtual disk controller IOPS caps, and SDN packet encapsulation) bleed through container abstractions.
2. **Behavioral Drift:** An identical containerized microservice running identical workloads experiences measurable deviations in p95 latency, scale-from-zero cold-start duration, and CPU throttling.
3. **Recovery Asymmetry:** Disaster recovery policies behave dissimilarly due to variations in pod eviction timing, storage volume detach/attach latencies, and health probe re-registration intervals.

**CLOUD-223** solves this by coupling:
- A unified multi-cloud deployment abstraction layer (`ProviderFactory` and `IDeploymentProvider`)
- An empirical measurement engine (`infraDiffEngine`) tracking 10 infrastructure dimensions
- A controlled fault injection engine (`chaosEngine`) testing 5 attack vectors
- An automated self-healing evaluator (`recoveryEngine`) quantifying MTTD and MTTR
- A tamper-evident cryptographic evidence ledger (`evidenceWriter` using SHA-256 manifests)

---

## 2. Global System Architecture

```mermaid
graph TB
    subgraph ClientLayer["Presentation & Operator Layer (React 19 + TypeScript + Vite)"]
        UI_Dash["Executive Dashboard & KPIs"]
        UI_Deploy["Deployment Center & Wizard"]
        UI_Diff["Infra Diff & Parity Matrix"]
        UI_Chaos["Chaos Studio & Fault Injection"]
        UI_Evidence["Cryptographic Evidence Center"]
    end

    subgraph GatewayLayer["API & Communication Gateway (Node.js + Express + Socket.IO)"]
        REST_API["REST API Router (/api/v1)"]
        WS_Hub["WebSocket / Socket.IO Live Telemetry Hub"]
        Auth_MW["Zero-Trust Auth & RBAC Middleware"]
        Sanitizer["OWASP Input Sanitizer & Traversal Defense"]
        RateLimiter["Adaptive Rate Limiter"]
    end

    subgraph CoreEngineLayer["CLOUD-223 Abstraction & Evaluation Engines"]
        DeployEngine["Deployment Orchestration Engine (13 Steps)"]
        InfraDiffEngine["Infrastructure Difference Engine (10 Dimensions)"]
        PortabilityEngine["Multi-Dimensional Portability Scoring"]
        ChaosEngine["Chaos Injection Studio (5 Attack Vectors)"]
        RecoveryEngine["Automated Recovery & MTTR Evaluator"]
        EvidenceEngine["Cryptographic Evidence Writer (SHA-256)"]
    end

    subgraph AbstractionLayer["Cloud Abstraction Layer (IDeploymentProvider)"]
        Factory["ProviderFactory"]
        AwsAdapter["AWS Adapter (AWS SDK v3 / EKS)"]
        AzureAdapter["Azure Adapter (Azure ARM / AKS)"]
        GcpAdapter["GCP Adapter (Google Cloud SDK / GKE)"]
    end

    subgraph HeterogeneousInfra["Target Heterogeneous Cloud Infrastructure"]
        subgraph AWS_Cloud["Amazon Web Services (AWS)"]
            EKS["Amazon EKS (K8s 1.29)"]
            EBS["gp3 EBS Storage"]
            VPC_AWS["AWS VPC CNI"]
            CW["CloudWatch & OTel"]
        end
        subgraph Azure_Cloud["Microsoft Azure"]
            AKS["Azure Kubernetes Service (AKS)"]
            AzureDisk["Premium SSD v2"]
            AzureCNI["Azure CNI Overlay"]
            AzureMon["Azure Monitor & App Insights"]
        end
        subgraph GCP_Cloud["Google Cloud Platform (GCP)"]
            GKE["Google Kubernetes Engine (GKE Autopilot)"]
            GCPDisk["Balanced Persistent Disk"]
            GCPVPC["GCP VPC-Native Networking"]
            GCPMon["Cloud Monitoring"]
        end
    end

    subgraph DataPersistenceLayer["Persistence & Cryptographic Evidence Store"]
        SQLite_DB[("Relational Datastore\nSQLite WAL / PostgreSQL")]
        ManifestLedger[("Immutable Evidence Ledger\nevidence/manifest.json")]
    end

    ClientLayer -->|HTTPS REST / WSS| GatewayLayer
    GatewayLayer --> CoreEngineLayer
    CoreEngineLayer --> AbstractionLayer
    CoreEngineLayer --> DataPersistenceLayer

    Factory --> AwsAdapter
    Factory --> AzureAdapter
    Factory --> GcpAdapter

    AwsAdapter --> AWS_Cloud
    AzureAdapter --> Azure_Cloud
    GcpAdapter --> GCP_Cloud

    AWS_Cloud -.->|OpenTelemetry & Metrics| CoreEngineLayer
    Azure_Cloud -.->|OpenTelemetry & Metrics| CoreEngineLayer
    GCP_Cloud -.->|OpenTelemetry & Metrics| CoreEngineLayer
```

---

## 3. Provider Abstraction Architecture (`IDeploymentProvider`)

The platform strictly isolates user applications from provider-specific SDK APIs through the **Factory + Adapter Pattern**.

```mermaid
classDiagram
    class IDeploymentProvider {
        <<interface>>
        +deploy(appSpec, config) Promise~DeploymentResult~
        +getStatus(deploymentId) Promise~DeploymentStatus~
        +getMetrics(resourceId) Promise~MetricSnapshot~
        +getLogs(resourceId, lines) Promise~LogStream~
        +injectFault(scenario, target) Promise~FaultResult~
        +evaluateRecovery(faultId) Promise~RecoveryMetrics~
        +rollback(deploymentId) Promise~RollbackResult~
        +terminate(resourceId) Promise~TerminationResult~
    }

    class BaseDeploymentProvider {
        <<abstract>>
        #providerName: String
        #credentials: Object
        #logger: WinstonLogger
        +validateSpec(appSpec) Boolean
        +formatEndpoint(rawUrl) String
        +recordTelemetry(metricPayload) Void
    }

    class AwsDeploymentProvider {
        -eksClient: EKSClient
        -cloudWatchClient: CloudWatchClient
        -stsClient: STSClient
        +deploy()
        +injectFault()
        +getMetrics()
    }

    class AzureDeploymentProvider {
        -computeClient: ComputeManagementClient
        -containerClient: ContainerServiceClient
        -monitorQuery: MetricsQueryClient
        +deploy()
        +injectFault()
        +getMetrics()
    }

    class GcpDeploymentProvider {
        -clusterManager: ClusterManagerClient
        -metricServiceClient: MetricServiceClient
        +deploy()
        +injectFault()
        +getMetrics()
    }

    class ProviderFactory {
        +getProvider(cloudTarget, credentials) IDeploymentProvider
        +getSupportedProviders() Array~String~
    }

    IDeploymentProvider <|.. BaseDeploymentProvider
    BaseDeploymentProvider <|-- AwsDeploymentProvider
    BaseDeploymentProvider <|-- AzureDeploymentProvider
    BaseDeploymentProvider <|-- GcpDeploymentProvider
    ProviderFactory ..> IDeploymentProvider : Instantiates
```

---

## 4. End-to-End 13-Step Deployment Sequence

When a multi-cloud deployment is triggered from the UI, the backend executes a rigorous 13-step pipeline designed to prevent false positives and capture execution evidence:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Evaluator
    participant UI as React UI (Deployment Center)
    participant Engine as DeploymentEngine
    participant Factory as ProviderFactory
    participant Provider as Cloud Provider Adapter
    participant Cloud as Cloud IaaS (AWS / Azure / GCP)
    participant OTel as Telemetry Harvester
    participant Diff as infraDiffEngine
    participant EvWriter as evidenceWriter

    Dev->>UI: Submit App Spec (Image, Port, Replicas, Targets: AWS, Azure, GCP)
    UI->>Engine: POST /api/v1/deployments/create
    Engine->>Engine: Step 1: Validate Application Spec & Resource Limits
    Engine->>Engine: Step 2: Verify Credentials & Live Account Connectivity
    Engine->>Engine: Step 3: Check Local Docker Host Daemon Status
    Engine->>Engine: Step 4: Verify Kubernetes kubectl Reachability
    Engine->>Engine: Step 5: Validate Environment Secrets & RBAC Permissions
    Engine->>Engine: Step 6: Generate Universal K8s Manifests (Deployment, Service, HPA, Ingress)
    Engine->>Engine: Step 7: Synthesize Helm Chart (Chart.yaml & values.yaml)
    Engine->>Factory: Step 8: Instantiate Provider Adapters (AWS, Azure, GCP)
    Engine->>Provider: Step 9: Execute Concurrent Provisioning Pipeline
    Provider->>Cloud: Step 10: Apply Manifests to Cluster (EKS / AKS / GKE)
    Cloud-->>Provider: Ingress Endpoint Allocated (HTTP 200)
    Provider-->>Engine: Step 11: Deployment Completed & Ingress Verified
    Engine->>UI: Stream Step Progress (0% -> 100%) via WebSocket
    Engine->>OTel: Step 12: Stream Application stdout/stderr Logs
    OTel->>Diff: Harvest Latency, Cold Start, CPU, Memory, IOPS
    Diff->>Diff: Step 13: Compute Behavioral Variance & Abstraction Leakage
    Diff->>EvWriter: Write Telemetry & Output to Sealed File
    EvWriter->>EvWriter: Compute SHA-256 Checksum & Append to manifest.json
    EvWriter-->>UI: Return Verified Deployment Dossier
```

---

## 5. Controlled Fault-Injection and Self-Healing Feedback Loop

To validate **Recovery Portability**, CLOUD-223 incorporates an automated chaos injection and recovery analysis cycle:

```mermaid
graph TD
    A[Start Chaos Experiment] --> B{Select Attack Vector}
    B -->|Scenario 1| C1[Pod Death / Replica Eviction]
    B -->|Scenario 2| C2[Network Latency Injection +150ms]
    B -->|Scenario 3| C3[Memory Pressure Exhaustion]
    B -->|Scenario 4| C4[Storage IOPS Clamping]
    B -->|Scenario 5| C5[Node Cache Cold-Start Flush]

    C1 --> D[chaosEngine Injects Fault into Target Cluster]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D

    D --> E[Application Enters Degraded State / 503 Service Unavailable]
    E --> F[recoveryEngine Starts Polling Loop (Interval: 100ms)]
    
    F --> G{HTTP Health Probe Returns 200 OK?}
    G -- No --> H[Record Elapsed Time & Tick Probe Count]
    H --> F
    G -- Yes --> I[Mark Self-Healing Succeeded]

    I --> J[Compute MTTD: Mean Time to Detect]
    I --> K[Compute MTTR: Mean Time to Recover]
    
    J --> L[Package Run Parameters, Logs, and Timings]
    K --> L
    L --> M[evidenceWriter Generates Immutable Run File]
    M --> N[Calculate SHA-256 Checksum]
    N --> O[Append Entry to evidence/manifest.json]
    O --> P[Update UI Chaos Studio & Recovery Scorecard]
```

---

## 6. Infrastructure Difference Engine (`infraDiffEngine`)

The `infraDiffEngine` normalizes runtime signals and detects where underlying infrastructure leaks through the container abstraction:

| Dimension | Measured Metric | Leakage Mechanism | Reference Baseline | Azure AKS | GCP GKE |
|---|---|---|---|---|---|
| **Storage IOPS** | Read/Write throughput (MB/s) | Virtual disk driver queue depth & throttling | 850 MB/s (gp3) | 620 MB/s (-27.1%) | 790 MB/s (-7.0%) |
| **Network Latency** | Inter-service ping & HTTP RTT | SDN encapsulation & NSG connection tracking | 102 ms | 135 ms (+32.3%) | 110 ms (+7.8%) |
| **Compute Startup** | Scale-from-zero container start | Hypervisor sandbox instantiation overhead | 2.1 s | 3.4 s (+61.9%) | 2.5 s (+19.0%) |
| **Memory Efficiency** | RSS footprint under identical load | Kernel page allocator overhead & cgroup limits | 245 MB | 258 MB (+5.3%) | 248 MB (+1.2%) |
| **CPU Utilization** | Core throttling rate under spike | VCPU scheduling time-slice quantum | 42% | 51% (+21.4%) | 44% (+4.7%) |

---

## 7. Security Boundaries & Zero-Trust Governance

1. **Authentication & Token Integrity:**
   - Dual-mode authentication supporting Azure Entra ID OAuth 2.0 / OIDC and local signed JWTs.
   - Cryptographic validation of claims, role-based access control (SuperAdmin, PlatformAdmin, DevOps, Viewer), and session expiration.
2. **Tenant & Data Isolation:**
   - Strict multi-tenancy isolation enforced in database queries using parameterized tenant scoping (`WHERE tenant_id = ?`).
   - Prevents cross-organization data leakage.
3. **Input Sanitization & Attack Prevention:**
   - Rigorous OWASP sanitization on all string inputs preventing XSS, SQL injection, and path traversal (`../` sequence rejection).
4. **Secrets & Credential Hygiene:**
   - Zero hardcoded cloud credentials or private keys in Git history or client bundles.
   - Provider credentials stored in encrypted environment configurations or cloud native secret vaults (AWS Secrets Manager, Azure Key Vault).
5. **Tamper-Evident Audit Trail:**
   - All administrative operations, deployments, and chaos experiments trigger cryptographically signed audit logs stored with timestamp, actor identity, previous state, and current state.
