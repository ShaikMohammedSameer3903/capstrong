# O4 Integration Evidence — End-to-End Execution Trace

**Document ID**: CLOUD-223-O4-INTEGRATION  
**Date**: 2026-08-02  
**Telemetry Config**: `server/telemetry.js`  
**WebSocket Gateway**: `server/websockets/gateway.js`

---

## 1. Integrated Execution Pipeline

1. **Normal Flow**: Deployment initiated via `deploymentService.js` → OpenTelemetry spans created → WebSockets logs emitted.
2. **Fault Injection**: Chaos experiment executed via `chaosEngine.js` → fault metrics recorded in `evidence_runs`.
3. **Recovery Verification**: `recoveryEngine.js` verifies state consistency → audit log persisted in `audit_logs` DB table.

## 2. Integration Test Evidence References

- `server/test_type_specific_workflows.js`
- `evidence/runs/acceptance/nt-chaos/2026-08-02T15-25-34-463Z-multi-chaos.json`
- `evidence/runs/acceptance/nt-4/2026-08-02T15-25-34-469Z-multi-negative-test.json`
