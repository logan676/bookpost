import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db/client'
import { users, sessions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { randomBytes, pbkdf2Sync } from 'crypto'
import { log } from '../utils/logger'

const authLog = log.child('Auth')
const app = new OpenAPIHono()

// Helper: Hash password
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

// Helper: Verify password
function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    authLog.e(`Invalid password hash format for verification`)
    return false
  }
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) {
    authLog.e(`Missing salt or hash in stored password`)
    return false
  }
  const verifyHash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

// Helper: Generate token
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// Schemas
const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  isAdmin: z.boolean().nullable(),
  createdAt: z.string().nullable(),
})

const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
})

const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

// POST /api/auth/register
const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  summary: 'Register a new user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            username: z.string().min(2).optional(),
            email: z.string().email(),
            password: z.string().min(6),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: z.object({ data: AuthResponseSchema }),
        },
      },
    },
    400: {
      description: 'Validation error or user exists',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(registerRoute, async (c) => {
  const { username, email, password } = c.req.valid('json')

  // Check if user exists
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) {
    return c.json({
      error: { code: 'USER_EXISTS', message: 'Email already registered' },
    }, 400)
  }

  // Derive username from email if not provided
  const derivedUsername = username || email.split('@')[0]

  // Create user
  const passwordHash = hashPassword(password)
  const [user] = await db.insert(users).values({
    username: derivedUsername,
    email,
    passwordHash,
  }).returning()

  // Create session
  const accessToken = generateToken()
  const refreshToken = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await db.insert(sessions).values({
    userId: user.id,
    token: accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
  })

  return c.json({
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt?.toISOString() ?? null,
      },
      accessToken,
      refreshToken,
    },
  }, 201)
})

// POST /api/auth/login
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Login with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.object({ data: AuthResponseSchema }),
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json')

  // Find user
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) {
    return c.json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    }, 401)
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return c.json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    }, 401)
  }

  // Create session
  const accessToken = generateToken()
  const refreshToken = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    userId: user.id,
    token: accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
  })

  return c.json({
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt?.toISOString() ?? null,
      },
      accessToken,
      refreshToken,
    },
  }, 200)
})

// POST /api/auth/refresh
const refreshRoute = createRoute({
  method: 'post',
  path: '/refresh',
  tags: ['Auth'],
  summary: 'Refresh access token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            refreshToken: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token refreshed',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              accessToken: z.string(),
              refreshToken: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Invalid refresh token',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(refreshRoute, async (c) => {
  const { refreshToken } = c.req.valid('json')

  // Find session
  const [session] = await db.select()
    .from(sessions)
    .where(eq(sessions.refreshToken, refreshToken))
    .limit(1)

  if (!session || !session.refreshExpiresAt || new Date(session.refreshExpiresAt) < new Date()) {
    return c.json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' },
    }, 401)
  }

  // Get user data
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1)

  // Generate new tokens
  const newAccessToken = generateToken()
  const newRefreshToken = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Update session
  await db.update(sessions)
    .set({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      refreshExpiresAt,
    })
    .where(eq(sessions.id, session.id))

  return c.json({
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      } : undefined,
    },
  }, 200)
})

// GET /api/auth/me
const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  summary: 'Get current user',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Current user info',
      content: {
        'application/json': {
          schema: z.object({ data: UserSchema }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(meRoute, async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' },
    }, 401)
  }

  const token = authHeader.substring(7)
  const [session] = await db.select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1)

  if (!session || new Date(session.expiresAt) < new Date()) {
    return c.json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    }, 401)
  }

  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, session.userId!))
    .limit(1)

  if (!user) {
    return c.json({
      error: { code: 'UNAUTHORIZED', message: 'User not found' },
    }, 401)
  }

  return c.json({
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt?.toISOString() ?? null,
    },
  })
})

// POST /api/auth/reset-password (temporary for fixing accounts)
const resetPasswordRoute = createRoute({
  method: 'post',
  path: '/reset-password',
  tags: ['Auth'],
  summary: 'Reset password for existing account',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            newPassword: z.string().min(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password reset successful',
      content: {
        'application/json': {
          schema: z.object({ data: AuthResponseSchema }),
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
})

app.openapi(resetPasswordRoute, async (c) => {
  const { email, newPassword } = c.req.valid('json')

  authLog.i(`Password reset attempt for email: ${email}`)

  // Find user
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) {
    return c.json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  // Update password
  const passwordHash = hashPassword(newPassword)
  await db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id))

  authLog.i(`Password reset successful for user: ${user.id} (${email})`)

  // Create session
  const accessToken = generateToken()
  const refreshToken = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    userId: user.id,
    token: accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
  })

  return c.json({
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt?.toISOString() ?? null,
      },
      accessToken,
      refreshToken,
    },
  })
})

export { app as authRoutes }
