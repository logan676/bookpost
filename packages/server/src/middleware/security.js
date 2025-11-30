/**
 * Security Middleware
 * Comprehensive security headers and protections using Helmet
 */

import helmet from 'helmet'
import hpp from 'hpp'
import compression from 'compression'

// ============================================
// Helmet Configuration
// ============================================

/**
 * Security headers middleware
 * Provides protection against common web vulnerabilities
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'], // Allow images from various sources
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", 'https:', 'wss:'], // Allow API connections
      mediaSrc: ["'self'", 'https:', 'blob:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disable for compatibility with external resources
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for API
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  // Frameguard (X-Frame-Options)
  frameguard: { action: 'deny' },
  // Hide X-Powered-By
  hidePoweredBy: true,
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff (X-Content-Type-Options)
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // X-XSS-Protection (deprecated but still useful for old browsers)
  xssFilter: true,
})

/**
 * Development-friendly security headers
 * Less restrictive CSP for local development
 */
export const devSecurityHeaders = helmet({
  contentSecurityPolicy: false, // Disable CSP in development
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: false, // Disable HSTS in development
})

// ============================================
// HTTP Parameter Pollution Protection
// ============================================

/**
 * Protect against HTTP Parameter Pollution attacks
 * Allows whitelisted query parameters to have multiple values
 */
export const hppProtection = hpp({
  whitelist: [
    'page',
    'limit',
    'sort',
    'order',
    'category',
    'tag',
    'type',
    'status',
    'ids', // Allow multiple IDs
  ],
})

// ============================================
// Response Compression
// ============================================

/**
 * Compress responses for better performance
 * Excludes already compressed content types
 */
export const compressionMiddleware = compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if 'x-no-compression' header is present
    if (req.headers['x-no-compression']) {
      return false
    }
    // Fall back to standard filter
    return compression.filter(req, res)
  },
})

// ============================================
// Additional Security Utilities
// ============================================

/**
 * Sanitize request body to prevent NoSQL injection
 * Removes keys starting with $ or containing .
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body)
  }
  next()
}

/**
 * Recursively sanitize an object
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys that could be used for injection
    if (key.startsWith('$') || key.includes('.')) {
      continue
    }
    sanitized[key] = sanitizeObject(value)
  }
  return sanitized
}

/**
 * Prevent timing attacks on authentication
 * Constant-time string comparison
 */
export const constantTimeCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ============================================
// Request ID Middleware
// ============================================

/**
 * Add unique request ID to each request
 * Useful for logging and tracing
 */
export const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || generateRequestId()
  req.id = id
  res.setHeader('X-Request-Id', id)
  next()
}

/**
 * Generate a unique request ID
 */
const generateRequestId = () => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

// ============================================
// Export Combined Security Middleware
// ============================================

const isProduction = process.env.NODE_ENV === 'production'

export const securityMiddleware = [
  requestId,
  isProduction ? securityHeaders : devSecurityHeaders,
  hppProtection,
  compressionMiddleware,
  sanitizeBody,
]

export default {
  securityHeaders,
  devSecurityHeaders,
  hppProtection,
  compressionMiddleware,
  sanitizeBody,
  constantTimeCompare,
  requestId,
  securityMiddleware,
}
