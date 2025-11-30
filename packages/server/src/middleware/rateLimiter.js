/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit'

// ============================================
// Rate Limiter Configurations
// ============================================

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP (higher limit for development)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path.startsWith('/api/health/')
  },
})

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP in production, 100 in development
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * File upload rate limiter
 * 10 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: 'Upload limit exceeded',
    message: 'You can upload up to 10 files per hour. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Search rate limiter
 * 30 searches per minute per IP
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: 'Search limit exceeded',
    message: 'Too many search requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Create a custom rate limiter
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 */
export const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: options.message || 'Too many requests. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
}

export default {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  searchLimiter,
  createRateLimiter,
}
