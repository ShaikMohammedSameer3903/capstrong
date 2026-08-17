/**
 * Dynamic Environment Configuration & API Auto-Discovery
 * 
 * - In development: empty string (Vite proxy handles /api/* → localhost:3001)
 * - In production: VITE_API_BASE_URL must be set via environment
 * 
 * NO hardcoded production URLs — all configuration via environment variables.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? (import.meta.env.VITE_API_URL || '') // Fallback to empty — CORS will block if misconfigured
    : ''); // Empty for local Vite proxy

export const CURRENT_ENV = import.meta.env.DEV ? 'Development' : 'Production';
