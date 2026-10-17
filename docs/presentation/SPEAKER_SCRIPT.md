# SAMYAK-2026: 5–7 Minute Presentation Speaker Script
**Project: CLOUD-223 — Application Platform Abstraction Over Heterogeneous Cloud Infrastructure**

* **Presenter:** Shaik Mohammed Sameer (Team Lead, 2300030621)
* **Co-Presenters:** Pravallika Gubba, Jeethu Kumar Ganchi, Khammapati Ganesh
* **Guide:** Dr. N. Raghavendra Sai

---

### Slide 1: Title Slide (0:00 – 0:35)
> *"Good morning, respected evaluators and faculty members. Welcome to the capstone presentation for **CLOUD-223: Application Platform Abstraction Over Heterogeneous Cloud Infrastructure**, Project Code C2C-94.*
> *I am Shaik Mohammed Sameer, presenting alongside my teammates Pravallika, Jeethu, and Ganesh, under the esteemed guidance of Dr. N. Raghavendra Sai from the Department of Computer Science & Engineering, KL University."*

---

### Slide 2: Problem Statement — The "Portability Illusion" (0:35 – 1:30)
> *"Today, over 89% of enterprise organizations adopt multi-cloud architectures. The general assumption is: if our code compiles on AWS, Azure, and Google Cloud, the application is portable. But our research reveals this is a dangerous **'Portability Illusion'**.*
> *We define the **Core Triad**: Deployment Portability is not equal to Behavioral Portability, which is not equal to Recovery Portability.*
> *Underlying physical hardware—Nitro vs. Hyper-V vs. KVM hypervisors, disk IOPS throttles, and SDN network encapsulation—causes **Abstraction Leakage**, producing dramatic behavioral drift in latency and cold-start times."*

---

### Slide 3: Existing Approaches & Research Gap (1:30 – 2:15)
> *"Why can't existing tools solve this?*
> *- **Terraform** provisions resources, but its job ends once infrastructure exists.*
> *- **Kubernetes** schedules containers, but does not isolate physical disk and CPU variances.*
> *- **PaaS tools** assume uniform cloud behavior.*
> *There has been **zero unified framework** that deploys across AWS, Azure, and GCP while measuring runtime parity, performing controlled chaos injection, and producing verifiable cryptographic evidence. CLOUD-223 fills this critical research gap."*

---

### Slide 4: Target Objectives (2:15 – 2:50)
> *"Our project delivered on 5 primary engineering goals:*
> *1. A unified abstraction layer using the Factory and Adapter design pattern.*
> *2. An empirical difference engine (`infraDiffEngine`) evaluating 10 infrastructure dimensions.*
> *3. A native chaos engineering engine (`chaosEngine`) testing 5 attack vectors.*
> *4. An automated recovery evaluator measuring self-healing MTTR.*
> *5. An immutable cryptographic ledger using SHA-256 evidence manifests."*

---

### Slide 5: System Architecture & Technical Stack (2:50 – 3:35)
> *"Architecturally, our system is built in 4 decoupled layers:*
> *At the top is our React 19 and TypeScript dashboard with real-time WebSocket streaming.*
> *In the middle is our Node.js and Express gateway with zero-trust RBAC.*
> *Our core abstraction layer uses `ProviderFactory` to dynamically instantiate adapters for AWS EKS, Azure AKS, and GCP GKE.*
> *Finally, our observability pipeline pairs OpenTelemetry and Prometheus scrapers with MongoDB Atlas and SQLite persistence."*

---

### Slide 6: Platform Capabilities (3:35 – 4:15)
> *"The platform delivers 12 core modules, notably:*
> *- An Executive Multi-Cloud Dashboard.*
> *- A 13-step automated deployment pipeline with pre-deployment safety checks.*
> *- An Infrastructure Difference Engine.*
> *- A Chaos Studio and Automated Recovery Evaluator.*
> *- A Cryptographic Evidence Center with SHA-256 tamper-proofing."*

---

### Slide 7: Demonstration Workflow (4:15 – 4:55)
> *"In our live demo, a developer inputs a single universal application specification, checks target clouds AWS, Azure, and GCP, and clicks deploy. Our WebSocket pipeline generates provider manifests, provisions live ingress endpoints, harvests runtime metrics, runs chaos experiments, and logs SHA-256 evidence in seconds."*

---

### Slide 8: Experimental Findings & Acceptance KPIs (4:55 – 5:45)
> *"Here are our key empirical findings:*
> *1. We identified **3 critical leakage points**: Azure storage throughput dropped 27.1% compared to AWS gp3, latency drifted +32.3%, and cold-start time was 61.9% slower.*
> *2. Our measured **Behavioral Parity Score is 33.33%** across 3 multi-cloud batches under strict ±10% tolerance bounds. This proves our hypothesis: successful deployment does not mean equivalent runtime behavior!*
> *3. Our static-seed repeatability standard deviation is **0.0**, demonstrating perfect experimental determinism.*
> *4. In chaos recovery testing, we achieved **100% automated self-healing** across all 5 failure scenarios with an MTTR under 2.8 seconds."*

---

### Slide 9: Negative Testing Campaign (5:45 – 6:15)
> *"To ensure zero false positives, we developed a 5-test negative campaign:*
> *- NT-1 proved leakage detection.*
> *- NT-2 confirmed telemetry variance.*
> *- NT-3 proved that invalid credentials safely fail and never fabricate fake cloud deployments.*
> *- NT-4 verified state consistency during partial outages.*
> *- NT-5 proved concurrency idempotency. All 5 tests pass 100%."*

---

### Slide 10: Conclusion & Acknowledgements (6:15 – 6:45)
> *"In conclusion, CLOUD-223 transforms multi-cloud portability from an unverified marketing assumption into a mathematically verifiable, evidence-backed engineering discipline.*
> *We extend our deepest gratitude to Dr. N. Raghavendra Sai and the faculty of CSE at KL University.*
> *Thank you, and we are now open for your questions and prototype evaluation."*
