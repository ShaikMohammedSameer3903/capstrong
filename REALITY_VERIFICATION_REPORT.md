# CloudOps — Reality Verification Report

**Date**: 2026-08-02  
**Status**: Evidence-backed

## 1. Provider & Resource Coverage

Resource counts are determined by actual cloud account discovery scans, not hardcoded values.
To view current counts, query the `resources` table:

```sql
SELECT provider, COUNT(*) as count FROM resources GROUP BY provider;
```

## 2. Evidence Trail

All verification claims trace to:
- Discovery scan results in `server/services/discoveryEngine.js`
- Evidence files in `evidence/runs/`
- Manifest integrity via `evidence/manifest.json`

## 3. Error Handling

All `/api/monitoring/*` routes use `classifyCloudError(err, provider)` via `server/middleware/errorClassifier.js` for proper error categorization (429/401/403 handling).
