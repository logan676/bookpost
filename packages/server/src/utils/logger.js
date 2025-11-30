/**
 * Pino Logger Configuration
 * Structured logging for production and development
 */

import pino from 'pino'
import { randomUUID } from 'crypto'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Create logger with appropriate configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash', 'token', 'refreshToken'],
    censor: '[REDACTED]'
  },

  // Add request ID to all logs
  base: {
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
  },

  // Pretty print in development
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
})

// Child loggers for specific modules
export const createLogger = (name) => logger.child({ module: name })

// HTTP request logger middleware
export const httpLogger = (req, res, next) => {
  const start = Date.now()

  // Generate request ID
  req.id = req.headers['x-request-id'] || randomUUID()

  // Log request
  logger.info({
    type: 'request',
    requestId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
  })

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - start
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'

    logger[level]({
      type: 'response',
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    })
  })

  next()
}

export default logger
