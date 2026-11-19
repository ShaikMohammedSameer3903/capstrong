/**
 * Dynamic Environment Configuration & API Auto-Discovery
 *
 * - In development (Vite dev server): empty string — Vite proxy handles /api/* → localhost:3001
 * - In production Docker (nginx):     empty string — nginx proxies /api/* → backend:3001
 * - In production external hosting:   set VITE_API_BASE_URL to the full backend URL
 *
 * When VITE_API_BASE_URL is not set (default), all fetch('/api/...') calls go through
 * the same origin's nginx reverse proxy — this is correct for Docker deployments.
 */
export const API_BASE_URL =
  // Only use an explicit override if it was set at build time AND it is NOT localhost
  // (localhost URLs baked into the bundle break Docker deployments where the browser
  //  cannot reach the internal container port directly).
  (() => {
    const explicit =
      import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    if (explicit && !explicit.includes('localhost') && !explicit.includes('127.0.0.1')) {
      return explicit;
    }
    // Fall back to relative paths — works for both Vite proxy (dev) and nginx proxy (Docker prod)
    return '';
  })();

export const CURRENT_ENV = import.meta.env.DEV ? 'Development' : 'Production';
