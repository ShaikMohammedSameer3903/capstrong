const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter for Authentication Endpoints
 * Prevents credential stuffing and brute-force attacks
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Enterprise limit: 100 auth requests per 15m window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.originalUrl.includes('/providers') || req.originalUrl.includes('/status'),
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Global Rate Limiter for General API Endpoints
 * Prevents API abuse and Denial of Service (DoS)
 */
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Limit each IP to 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'API rate limit exceeded. Please throttle your request frequency.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  authRateLimiter,
  apiRateLimiter
};
