# O3 Condition-Wise Error & Uncertainty Report

**Document ID**: CLOUD-223-O3-ERROR  
**Date**: 2026-08-06 (regenerated — KPI-2 remediation, CPU row added)  

---

## Error & Uncertainty Breakdown

| Condition / Variable | Measured Uncertainty | Confidence Interval (95%) | Primary Contributor |
|----------------------|----------------------|---------------------------|---------------------|
| Network Latency Ping | ±2.4ms | [20.1ms, 24.3ms] | Regional network routing jitter |
| Storage Read Speed | ±15.0 MB/s | [365 MB/s, 395 MB/s] | Host disk I/O burst throttling |
| Container Startup Time | ±0.15s | [2.25s, 2.55s] | Container image layer extraction |
| Memory Overhead | ±12.0 MB | [500 MB, 524 MB] | Node.js GC heap allocation |
| CPU Utilization / Throttling | ±3.2 pts | [22.0%, 28.4%] | vCPU scheduling / hypervisor throttling policy |

---

## Evidence Provenance
Calculated from `avg_cpu`, `avg_memory`, `avg_latency`, `avg_storage`, `avg_startup` aggregates in `deployment_metrics`, aggregated across all `ablation`/`diff` evidence runs recorded in `evidence/manifest.json`. The CPU row uses the same `avg_cpu` field `getInfraMatrix()` already queried but did not previously surface (see `evidence/o3-ablation.md`).
