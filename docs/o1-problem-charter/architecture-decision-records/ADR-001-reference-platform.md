# ADR-001: Reference Platform Choice

**Status**: Accepted  
**Date**: 2026-08-02  
**Decision**: Use Node.js/Express backend with React/Vite frontend and SQLite/PostgreSQL database

## Context

The CLOUD-223 capstone requires a reference platform that can deploy workloads to Azure, AWS, and GCP, collect metrics, and display infrastructure differences. The platform itself must be reproducible and version-locked.

## Decision

- **Backend**: Node.js 20.x with Express.js (`server/index.js`)
  - Rationale: All three cloud provider SDKs (Azure ARM, AWS SDK v3, GCP Client Libraries) have first-class Node.js support
  - Evidence: `server/package.json` lists 50+ cloud SDK dependencies

- **Frontend**: React 18 with Vite and TypeScript (`src/`)
  - Rationale: Component-based UI for complex dashboard with recharts visualization
  
- **Database**: SQLite 3 (development) / PostgreSQL (production)
  - Rationale: SQLite requires zero configuration for development; schema in `server/db/schema.sql` with 47 tables

- **Telemetry**: OpenTelemetry SDK with Prometheus exporter (`server/telemetry.js`)
  - Rationale: Vendor-neutral observability standard

## Consequences

- Node.js event loop limits CPU-intensive workload analysis (acceptable for this use case)
- SQLite limits concurrent write throughput (acceptable for development; PostgreSQL for production)
- Version lock required in `reference-impl/VERSION.lock`
