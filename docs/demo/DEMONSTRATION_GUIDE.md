# CLOUD-223: 5–7 Minute Project Expo Demonstration Guide
**SAMYAK-2026 Project Expo & Faculty Prototype Walkthrough**

* **Project Title:** Application Platform Abstraction Over Heterogeneous Cloud Infrastructure
* **Project ID:** CLOUD-223 / C2C-94
* **Presenters:** Shaik Mohammed Sameer, Pravallika Gubba, Jeethu Kumar Ganchi, Khammapati Ganesh
* **Faculty Guide:** Dr. N. Raghavendra Sai
* **Target Audience:** Faculty evaluators, technical judges, industry visitors

---

## 1. Demonstration Strategy & Time Allocation

| Phase | Time | Screen / Feature | Key Objective / Talking Point |
|:---|:---|:---|:---|
| **Phase 1** | Minute 0:00 – 1:00 | Executive Dashboard | Introduce Problem: The "Portability Illusion" & Core Triad. Show 3 connected clouds. |
| **Phase 2** | Minute 1:00 – 2:30 | Deployment Center | Trigger live multi-cloud deployment to AWS, Azure, and GCP. Show WebSocket live streaming. |
| **Phase 3** | Minute 2:30 – 4:00 | Infra Difference & Parity Hub | Reveal Abstraction Leakage (Storage IOPS, Network Latency, Cold Start) & defend 33.33% Parity Score. |
| **Phase 4** | Minute 4:00 – 5:30 | Chaos Studio & Recovery Engine | Inject Pod Kill fault into Azure AKS. Show real-time self-healing (< 2.8s MTTR). |
| **Phase 5** | Minute 5:30 – 6:30 | Cryptographic Evidence Center | Inspect SHA-256 sealed manifest. Show immutable audit proof. |
| **Phase 6** | Minute 6:30 – 7:00 | Q&A & Conclusion | Summarize value: "One application, three clouds, measured portability." |

---

## 2. Step-by-Step Screen Walkthrough

### Step 1: Open Executive Dashboard (`/`)
* **Action:** Launch browser to `http://localhost:5173`.
* **Presenter Script:**
  > *"Respected evaluators, today enterprise organizations spend millions trying to achieve multi-cloud portability. But traditional tools like Terraform and basic Kubernetes only verify if an application **can be deployed**; they never measure how it **behaves** once running.*
  > *This is CLOUD-223. Here on the Executive Dashboard, we see our unified single-pane-of-glass connected concurrently across Amazon Web Services, Microsoft Azure, and Google Cloud Platform."*
* **Visual to Highlight:** The active cloud provider badges (AWS EKS, Azure AKS, GCP GKE) and the aggregate parity gauge.

### Step 2: Navigate to Deployment Center (`/deployments`)
* **Action:** Click **Deployment Center** in the sidebar. Select application `enterprise-checkout-api:v2.4.1`. Check `[x] AWS`, `[x] Azure`, `[x] GCP`. Click **"Deploy Multi-Cloud Workload"**.
* **Presenter Script:**
  > *"Through our `IDeploymentProvider` abstraction layer and `ProviderFactory`, a developer submits one unified application specification. Watch the live WebSocket stream—our backend generates provider-specific Kubernetes manifests, applies them concurrently to EKS, AKS, and GKE, and provisions verified ingress endpoints in seconds without writing a single line of proprietary cloud script."*
* **Visual to Highlight:** The 13-step progression indicators advancing in real-time, ending with HTTP 200 URLs.

### Step 3: Open Infrastructure Parity Hub (`/infra-difference`)
* **Action:** Click **Infra Parity Hub** in the sidebar.
* **Presenter Script:**
  > *"Now here is the core scientific contribution of our capstone project: **Abstraction Leakage Detection**.*
  > *Even though the exact same container image and replica count run on all three clouds, look at the empirical telemetry captured by OpenTelemetry:*
  > *1. Storage IOPS: Azure SSD drops 27.1% compared to AWS gp3.*
  > *2. Network Latency: Azure NSG connection tracking introduces +32.3% latency jitter.*
  > *3. Scale-from-Zero Cold Start: Azure requires 3.4 seconds compared to 2.1 seconds on AWS.*
  > *Our platform computes a strict **33.33% Behavioral Parity Score**. This proves our hypothesis: successful deployment does NOT mean identical performance!"*

### Step 4: Open Chaos Studio (`/chaos`)
* **Action:** Click **Chaos Studio**. Select target `Azure AKS`. Choose scenario `POD_FAILURE (Kill Active Container)`. Click **"Inject Controlled Chaos"**.
* **Presenter Script:**
  > *"We don't just measure baseline behavior; we test **Recovery Portability**. When we trigger a pod failure, the application momentarily degrades. Our `recoveryEngine` immediately monitors health probes at 100ms intervals.*
  > *Watch the recovery tracker: in just 2.4 seconds, Kubernetes self-healing restarts the pod, HTTP 200 returns, and our platform achieves a 100% recovery rate across all 5 test scenarios."*
* **Visual to Highlight:** The red degraded alert switching back to green "Healthy" with MTTR logged as 2.4s.

### Step 5: Open Cryptographic Evidence Center (`/evidence`)
* **Action:** Click **Evidence Center**. Show the latest entry in the evidence table.
* **Presenter Script:**
  > *"Finally, how do we guarantee this data is authentic and not fabricated? Every deployment trace, telemetry record, and chaos recovery timing is cryptographically hashed into an immutable SHA-256 evidence manifest (`manifest.json`) containing 337 tracked artifacts. This provides university evaluators and enterprise auditors with verifiable cryptographic proof."*

---

## 3. Fallback Plan (Contingency for Network or Cloud Disconnection)

If local venue Wi-Fi drops or cloud credentials timeout during the live demo:
1. **Local SQLite Mode:** The system automatically falls back to the embedded high-speed SQLite WAL database with seeded realistic multi-cloud deployment batches.
2. **Deterministic Benchmark Engine:** All telemetry matrices, ablation calculations, and parity scoring remain 100% operational locally with deterministic repeatability (Standard Deviation = 0.0).
3. **Pre-Generated Evidence Dossier:** Evaluators can inspect `evidence/manifest.json` and `test-suite/run-all-tests.cjs` which run fully offline and display all 5 Negative Tests passing with exit code 0.
