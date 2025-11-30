/**
 * Environment Configuration
 * Type-safe environment variable validation with Zod
 */

import { z } from 'zod'
import { logger } from '../utils/logger.js'

// ============================================
// Environment Schema Definition
// ============================================

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database Configuration
  SQLITE_PATH: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().optional(),
  PGPORT: z.coerce.number().int().positive().optional(),
  PGDATABASE: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),

  // Authentication
  JWT_SECRET: z.string().min(32).optional(),

  // External APIs
  GOOGLE_BOOKS_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  // Cloudflare R2 Storage
  USE_R2_STORAGE: z.enum(['true', 'false']).default('false'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('bookpost-media'),
  R2_PUBLIC_URL: z.string().optional(),

  // AWS S3 Storage
  USE_S3_STORAGE: z.enum(['true', 'false']).default('false'),
  AWS_REGION: z.string().default('ap-northeast-2'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().default('bookpost-files'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
})

// ============================================
// Environment Validation
// ============================================

/**
 * Validate environment variables
 * @returns Validated environment configuration
 */
function validateEnv() {
  try {
    const result = envSchema.safeParse(process.env)

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }))

      logger.error({ errors }, 'Environment validation failed')

      // In production, fail fast
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Invalid environment configuration: ${JSON.stringify(errors)}`)
      }

      // In development, log warning but continue
      logger.warn('Continuing with default values in development mode')
      return envSchema.parse({})
    }

    return result.data
  } catch (error) {
    // If we can't even parse the schema, use defaults
    logger.warn({ err: error }, 'Failed to validate environment, using defaults')
    return {
      NODE_ENV: 'development',
      PORT: 3001,
      LOG_LEVEL: 'info',
      USE_R2_STORAGE: 'false',
      USE_S3_STORAGE: 'false',
      R2_BUCKET_NAME: 'bookpost-media',
      AWS_REGION: 'ap-northeast-2',
      S3_BUCKET_NAME: 'bookpost-files',
    }
  }
}

// ============================================
// Validated Environment Export
// ============================================

export const env = validateEnv()

// Convenience getters
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'

// ============================================
// Runtime Environment Checks
// ============================================

/**
 * Check if required environment variables for a feature are set
 * Returns boolean only - never exposes actual values
 */
export const featureFlags = {
  hasR2Storage: () => {
    return !!(env.USE_R2_STORAGE === 'true' &&
           process.env.R2_ACCOUNT_ID &&
           process.env.R2_ACCESS_KEY_ID &&
           process.env.R2_SECRET_ACCESS_KEY)
  },

  hasS3Storage: () => {
    return !!(env.USE_S3_STORAGE === 'true' &&
           process.env.AWS_ACCESS_KEY_ID &&
           process.env.AWS_SECRET_ACCESS_KEY)
  },

  hasCloudinary: () => {
    return !!(process.env.CLOUDINARY_CLOUD_NAME &&
           process.env.CLOUDINARY_API_KEY &&
           process.env.CLOUDINARY_API_SECRET)
  },

  hasGoogleBooks: () => {
    return !!process.env.GOOGLE_BOOKS_API_KEY
  },

  hasDeepSeek: () => {
    return !!process.env.DEEPSEEK_API_KEY
  },

  hasSecureJWT: () => {
    const secret = process.env.JWT_SECRET
    return !!(secret && secret.length >= 32 && secret !== 'your-super-secret-key-change-in-production')
  },
}

/**
 * Log environment status on startup
 */
export function logEnvironmentStatus() {
  logger.info({
    environment: env.NODE_ENV,
    port: env.PORT,
    features: {
      r2Storage: featureFlags.hasR2Storage(),
      s3Storage: featureFlags.hasS3Storage(),
      cloudinary: featureFlags.hasCloudinary(),
      googleBooks: featureFlags.hasGoogleBooks(),
      deepSeek: featureFlags.hasDeepSeek(),
      secureJWT: featureFlags.hasSecureJWT(),
    },
  }, 'Environment configuration loaded')

  // Warn about insecure JWT in production
  if (isProduction && !featureFlags.hasSecureJWT()) {
    logger.error('SECURITY WARNING: JWT_SECRET is not set or is using default value in production!')
  }
}

export default {
  env,
  isDevelopment,
  isProduction,
  isTest,
  featureFlags,
  logEnvironmentStatus,
}
