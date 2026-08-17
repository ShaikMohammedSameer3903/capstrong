# ADR-002: Cloud Targets

**Status**: Accepted  
**Date**: 2026-08-02  
**Decision**: Target Azure, AWS, and GCP as the three heterogeneous cloud providers

## Context

The capstone brief requires deployment to "at least two heterogeneous targets." The project's `server/providers/ProviderFactory.js` already implements a factory pattern supporting three providers.

## Decision

Target all three major public cloud providers:

| Provider | Implementation | SDK |
|----------|---------------|-----|
| Azure | `server/providers/AzureDeploymentProvider.js`, `server/providers/azure/AzureProvider.js` | `@azure/arm-resources@^5.2.0`, `@azure/identity@^4.13.1` |
| AWS | `server/providers/AwsDeploymentProvider.js`, `server/providers/aws/AwsProvider.js` | `@aws-sdk/client-ecs@^3.1068.0`, `@aws-sdk/client-sts@^3.1068.0` |
| GCP | `server/providers/GcpDeploymentProvider.js`, `server/providers/GcpProvider.js` | `@google-cloud/compute@^6.13.0`, `@google-cloud/run@^1.5.1` |

## Rationale

1. Three providers maximize the observable behavioral differences (storage IOPS, network policy, cold-start timing)
2. All three SDKs are available as npm packages with Node.js support
3. Credentials for all three are configured in `.env.example` and `.env.development`
4. The ProviderFactory pattern allows adding more providers without changing deployment logic

## Consequences

- Must maintain SDK version parity across providers (locked in `reference-impl/VERSION.lock`)
- Evidence must be collected per-provider for fair comparison
- Resource budget must be documented as equal across providers for valid comparison
