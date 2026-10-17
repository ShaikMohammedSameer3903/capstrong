# SAMYAK-2026: Evaluator FAQ & Defense Guide
**Top 10 High-Probability Examiner Questions & Winning Tactical Responses**

* **Project:** CLOUD-223 / C2C-94
* **Lead Architect:** Shaik Mohammed Sameer (2300030621)
* **Guide:** Dr. N. Raghavendra Sai

---

#### 1. "Why is your Behavioral Parity Score only 33.33%? Did your project fail?"
> **Winning Answer:**
> *"No, 33.33% is the empirical confirmation of our core research hypothesis. The problem statement of CLOUD-223 is that underlying physical infrastructure leaks through container abstractions.*
> *In our 3-batch benchmark across AWS, Azure, and GCP, 100% of the applications deployed successfully. However, when we measured them against strict ±10% tolerance bounds across 5 signals (latency, startup, memory, CPU, storage), only 1 of the 3 batches met identical performance.*
> *If our system claimed 100% parity, it would be scientifically dishonest. 33.33% proves that abstraction leakage exists and that our engine measures real differences."*

---

#### 2. "How is this different from simply using Docker and Kubernetes?"
> **Winning Answer:**
> *"Docker standardizes the packaging; Kubernetes standardizes the scheduling API. But Kubernetes does not change the physical hardware or hypervisor underneath.*
> *If a pod on Azure AKS takes 3.4 seconds to start up because of Hyper-V, and the same pod on AWS EKS takes 2.1 seconds because of Firecracker/Nitro, Kubernetes has no awareness of that drift. CLOUD-223 operates above Kubernetes to monitor, measure, and validate runtime parity."*

---

#### 3. "Why not just use Terraform or Crossplane?"
> **Winning Answer:**
> *"Terraform provisions infrastructure; its lifecycle finishes once the resources are created. CLOUD-223's primary job begins AFTER deployment: harvesting telemetry via OpenTelemetry, detecting performance drift, injecting controlled chaos faults, and evaluating automated self-healing."*

---

#### 4. "What prevents your platform from showing fake deployment success when cloud credentials are missing?"
> **Winning Answer:**
> *"We implemented test **NT-3: False-Positive Deployment Success Prevention**. If credentials are absent or invalid, our deployment engine strictly halts or logs a clearly demarcated SANDBOX status with explicit UI warnings. It never fakes real cloud resource creation."*

---

#### 5. "Why do you compute SHA-256 hashes for evidence?"
> **Winning Answer:**
> *"In academic research and enterprise compliance, reviewers need proof that experimental results were not manually edited. By concatenating telemetry logs, chaos inputs, and recovery times and generating a SHA-256 digest in `evidence/manifest.json`, we provide tamper-evident, auditable proof."*

---

#### 6. "How did you achieve a Static-Seed Repeatability Standard Deviation of 0.0?"
> **Winning Answer:**
> *"Our difference engine and ablation calculations are completely deterministic mathematical functions over recorded deployment telemetry. Across 3 independent re-evaluations, identical inputs produce identical outputs with zero standard deviation, proving the algorithm is mathematically sound."*

---

#### 7. "What attack vectors does your Chaos Studio inject?"
> **Winning Answer:**
> *"We test 5 distinct failure scenarios: container replica eviction (pod death), network packet latency (+150ms delay via Linux tc), memory cgroup pressure, virtual disk IOPS clamping, and container cache cold-start flushes."*

---

#### 8. "What was your Mean Time to Recover (MTTR)?"
> **Winning Answer:**
> *"Our platform achieved a 100% recovery rate across all 5 injected failure scenarios, with an average MTTR under 2.8 seconds, verified by polling HTTP health probes at 100-millisecond intervals."*

---

#### 9. "What database architecture is deployed?"
> **Winning Answer:**
> *"We deployed a dual-engine architecture: an embedded, high-performance SQLite engine running in Write-Ahead Logging (WAL) mode for local development and offline expo demonstrations, and a MongoDB Atlas cluster for multi-cloud telemetry and configuration persistence."*

---

#### 10. "What is your future roadmap for this project?"
> **Winning Answer:**
> *"1. AI/ML predictive drift forecasting using LSTM recurrent neural networks on OpenTelemetry streams.*
> *2. Real-time intelligent cloud brokering that dynamically routes traffic to the cloud provider offering the optimal price-to-performance ratio.*
> *3. Automated live database replication and cross-cloud failover during hyperscaler regional outages."*
