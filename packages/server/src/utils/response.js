/**
 * API Response Utilities
 * Provides standardized response formatting and error handling
 */

import { logger } from './logger.js'

// HTTP Status codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
}

// Error codes for client handling
export const ErrorCode = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.isApiError = true
  }

  static badRequest(message, code = ErrorCode.VALIDATION_ERROR, details = null) {
    return new ApiError(HttpStatus.BAD_REQUEST, code, message, details)
  }

  static unauthorized(message = 'Authentication required', code = ErrorCode.UNAUTHORIZED) {
    return new ApiError(HttpStatus.UNAUTHORIZED, code, message)
  }

  static forbidden(message = 'Access denied', code = ErrorCode.FORBIDDEN) {
    return new ApiError(HttpStatus.FORBIDDEN, code, message)
  }

  static notFound(resource = 'Resource') {
    return new ApiError(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, `${resource} not found`)
  }

  static conflict(message, code = ErrorCode.ALREADY_EXISTS) {
    return new ApiError(HttpStatus.CONFLICT, code, message)
  }

  static internal(message = 'Internal server error') {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, message)
  }
}

/**
 * Success response helper
 */
export function success(res, data, status = HttpStatus.OK) {
  return res.status(status).json({
    success: true,
    data,
  })
}

/**
 * Created response helper
 */
export function created(res, data) {
  return success(res, data, HttpStatus.CREATED)
}

/**
 * No content response helper
 */
export function noContent(res) {
  return res.status(HttpStatus.NO_CONTENT).send()
}

/**
 * Error response helper
 */
export function error(res, err, req = null) {
  if (err.isApiError) {
    // Log API errors at warn level
    logger.warn({
      err: { code: err.code, message: err.message },
      requestId: req?.id,
      path: req?.path,
    }, `API Error: ${err.message}`)

    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req?.id,
      },
    })
  }

  // Log unexpected errors at error level
  logger.error({
    err,
    requestId: req?.id,
    path: req?.path,
    stack: err.stack,
  }, `Unexpected error: ${err.message}`)

  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      requestId: req?.id,
    },
  })
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  return error(res, err, req)
}

/**
 * Validate required fields
 */
export function validateRequired(data, fields) {
  const missing = fields.filter(field => !data[field])
  if (missing.length > 0) {
    throw ApiError.badRequest(
      `Missing required fields: ${missing.join(', ')}`,
      ErrorCode.MISSING_REQUIRED_FIELD,
      { missingFields: missing }
    )
  }
}
