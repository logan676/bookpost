/**
 * Health Check Routes
 * Provides endpoints for monitoring service health
 */

import { Router } from 'express'
import db from '../config/database.js'
import { featureFlags, env } from '../config/env.js'

const router = Router()

// Start time for uptime calculation
const startTime = Date.now()

/**
 * Basic health check
 * GET /api/health
 * Returns simple status for load balancers
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Detailed health check
 * GET /api/health/detailed
 * Returns comprehensive health information
 */
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '0.1.0',
    environment: env.NODE_ENV,
    checks: {},
  }

  // Database check
  try {
    const dbResult = db.prepare('SELECT 1 as check_val').get()
    health.checks.database = {
      status: dbResult?.check_val === 1 ? 'ok' : 'error',
      latency: 0,
    }
  } catch (error) {
    health.status = 'degraded'
    health.checks.database = {
      status: 'error',
      error: error.message,
    }
  }

  // Memory usage
  const memUsage = process.memoryUsage()
  health.checks.memory = {
    status: 'ok',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024),
    unit: 'MB',
  }

  // Check memory threshold (warn if over 512MB heap)
  if (memUsage.heapUsed > 512 * 1024 * 1024) {
    health.checks.memory.status = 'warning'
    health.status = health.status === 'ok' ? 'warning' : health.status
  }

  // Feature flags status
  health.features = {
    r2Storage: featureFlags.hasR2Storage(),
    s3Storage: featureFlags.hasS3Storage(),
    cloudinary: featureFlags.hasCloudinary(),
    googleBooks: featureFlags.hasGoogleBooks(),
    deepSeek: featureFlags.hasDeepSeek(),
    secureJWT: featureFlags.hasSecureJWT(),
  }

  // Set appropriate status code
  const statusCode = health.status === 'ok' ? 200 : health.status === 'warning' ? 200 : 503

  res.status(statusCode).json(health)
})

/**
 * Liveness probe
 * GET /api/health/live
 * Simple check if the service is running
 */
router.get('/live', (req, res) => {
  res.json({ status: 'alive' })
})

/**
 * Readiness probe
 * GET /api/health/ready
 * Check if the service is ready to accept requests
 */
router.get('/ready', (req, res) => {
  try {
    // Check database connection
    const result = db.prepare('SELECT 1 as check_val').get()
    if (result?.check_val !== 1) {
      throw new Error('Database check failed')
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

export default router
