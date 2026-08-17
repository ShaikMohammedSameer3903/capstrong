# O4 Fault Simulation Method Documentation

**Document ID**: CLOUD-223-O4-FAULT-SIM  
**Last Updated**: 2026-08-02  
**Author**: Capstone Implementation  

## Purpose

This document describes the simulation method, fidelity level, and acceptability rationale for each fault type in the chaos engineering subsystem (`server/services/chaosEngine.js`). Per the capstone brief, when real infrastructure access is unavailable, each fault must be explicitly documented here.

---

## Fault Types

### 1. KILL_POD (Container/Pod Termination)

| Property | Value |
|----------|-------|
| **Real method** | `docker kill <container>` or `kubectl delete pod --force` |
| **Simulation fallback** | Timed delay (50ms) — no actual process terminated |
| **Fidelity: Real** | **High** — actual container process receives SIGKILL |
| **Fidelity: Simulated** | **Low** — no process termination occurs |
| **Acceptable proxy?** | Yes, with caveats. The simulation records the timing overhead of the chaos engine itself, which establishes a baseline for recovery-time measurement. Real perturbation is required for final acceptance (O5). |
| **Measurement emitted** | `killDurationMs`, `containerKilled` (boolean), verification method |

### 2. NODE_RESTART (Worker Node Drain & Restart)

| Property | Value |
|----------|-------|
| **Real method** | `kubectl drain <node> --ignore-daemonsets` → `kubectl uncordon <node>` |
| **Simulation fallback** | Timed delay (100ms) |
| **Fidelity: Real** | **High** — actual workload evacuation and rescheduling |
| **Fidelity: Simulated** | **Low** — no Kubernetes cluster interaction |
| **Acceptable proxy?** | Yes for development (partition=dev). Not acceptable for final acceptance without cluster access. |
| **Measurement emitted** | `drainDurationMs`, `nodeDrained` (boolean), `uncordoned` (boolean) |

### 3. CPU_STRESS (CPU Saturation)

| Property | Value |
|----------|-------|
| **Real method** | `docker exec <container> timeout 2 yes > /dev/null` |
| **Simulation fallback** | In-process computation loop (200ms `Math.sqrt` burn) |
| **Fidelity: Real** | **Medium** — CPU saturated inside container, but lacks kernel-level resource contention |
| **Fidelity: Simulated** | **Low** — only burns Node.js event loop, not system CPU |
| **Acceptable proxy?** | Yes. The in-process burn provides a measurable lower bound on CPU impact timing. |
| **Measurement emitted** | `stressDurationMs` or `inProcessBurnMs`, `operationsCompleted` |

### 4. NETWORK_LATENCY (Injected Packet Delay)

| Property | Value |
|----------|-------|
| **Real method** | `tc qdisc add dev eth0 root netem delay 250ms` inside container |
| **Simulation fallback** | `Promise.setTimeout(250)` — application-level delay |
| **Fidelity: Real** | **High** — kernel-level packet scheduling delay on the container's network interface |
| **Fidelity: Simulated** | **Low** — only delays the chaos engine's own execution, not actual network packets |
| **Acceptable proxy?** | Partially. The simulation demonstrates that the application's response-time tracking correctly detects a 250ms spike, but does not prove that the platform abstraction correctly handles network degradation. |
| **Measurement emitted** | `injectionDurationMs` or `actualDelayMs`, `latencyInjected` (boolean) |

### 5. STORAGE_DISCONNECT (Persistent Volume Unmount)

| Property | Value |
|----------|-------|
| **Real method** | `mount -o remount,ro /data` inside container (makes volume read-only) |
| **Simulation fallback** | Timed delay (30ms) |
| **Fidelity: Real** | **Medium** — volume becomes read-only, not fully disconnected; applications that only read will not notice |
| **Fidelity: Simulated** | **Low** — no storage interaction occurs |
| **Acceptable proxy?** | Partially. A full disconnect would require `umount -f /data`, which typically requires root and may crash the container. The read-only remount is a safer proxy that tests write-path failure handling. |
| **Measurement emitted** | `disconnectDurationMs`, `storageDisconnected` (boolean) |

---

## Evidence Protocol

Every chaos experiment execution:
1. Records a structured JSON evidence file to `evidence/runs/{partition}/`
2. Includes the `simulationMethod`, `fidelityLevel`, `realExecution` boolean, and raw `measurements`
3. Registers the file in the `evidence_runs` DB table with SHA-256 hash
4. Never generates a canned prose message — all output is structured data

## Fidelity Improvement Path

For final acceptance (O5 campaign), the following improvements should be applied:
- Ensure Docker daemon is running for KILL_POD and CPU_STRESS experiments
- Deploy to a Kubernetes cluster (local via kind/minikube or cloud-hosted) for NODE_RESTART
- Use a container with `iproute2` installed for NETWORK_LATENCY tc injection
- Use a container with a mounted volume for STORAGE_DISCONNECT testing
