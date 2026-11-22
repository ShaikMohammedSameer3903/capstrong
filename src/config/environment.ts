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
  (() => {
    const explicit =
      import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    if (explicit && !explicit.includes('localhost') && !explicit.includes('127.0.0.1')) {
      return explicit.replace(/\/+$/, '');
    }
    // Fall back to relative paths — works for both Vite proxy (dev) and nginx/Vercel proxy
    return '';
  })();

// Auto-prefix relative /api calls when an external backend URL is configured
if (typeof window !== 'undefined' && API_BASE_URL) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return originalFetch(`${API_BASE_URL}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

export const CURRENT_ENV = import.meta.env.DEV ? 'Development' : 'Production';
