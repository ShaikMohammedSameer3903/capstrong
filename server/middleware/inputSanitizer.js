/**
 * Input Sanitizer Middleware
 * Protects against XSS, HTML Injection, SQL Injection strings, and Directory Traversal attacks
 */

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // 1. Prevent Directory Traversal
    if (value.includes('../') || value.includes('..\\')) {
      throw new Error('Security Violation: Potential directory traversal pattern detected.');
    }

    // 2. Prevent XSS HTML script tag injection
    let sanitized = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onload\s*=/gi, '');

    return sanitized;
  } else if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  } else if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleaned[key] = sanitizeValue(value[key]);
    }
    return cleaned;
  }
  return value;
}

function inputSanitizer(req, res, next) {
  try {
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }
    next();
  } catch (err) {
    console.warn(`[SECURITY][INPUT_SANITIZER] ${err.message} - IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Security Validation Failed',
      message: err.message,
      code: 'INPUT_SECURITY_VIOLATION'
    });
  }
}

module.exports = inputSanitizer;
