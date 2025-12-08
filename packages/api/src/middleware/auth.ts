/**
 * Authentication Middleware
 */

import { Context, Next } from 'hono'
import { db } from '../db/client'
import { sessions, users } from '../db/schema'
import { eq } from 'drizzle-orm'

export interface AuthUser {
  id: number
  username: string
  email: string
  isAdmin: boolean | null
}

// Extend Hono context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    userId: number
  }
}

/**
 * Auth middleware - requires valid token
 * Returns 401 if not authenticated
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    }, 401)
  }

  const token = authHeader.substring(7)

  try {
    const [session] = await db.select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1)

    if (!session || !session.expiresAt || new Date(session.expiresAt) < new Date()) {
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

    // Set user in context
    c.set('user', {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    })
    c.set('userId', user.id)

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication failed' },
    }, 401)
  }
}

/**
 * Optional auth middleware - sets user if token is valid, but doesn't require it
 * Useful for routes that work differently for logged-in vs anonymous users
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)

    try {
      const [session] = await db.select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1)

      if (session && session.expiresAt && new Date(session.expiresAt) >= new Date()) {
        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, session.userId!))
          .limit(1)

        if (user) {
          c.set('user', {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
          })
          c.set('userId', user.id)
        }
      }
    } catch (error) {
      // Silently fail for optional auth
      console.error('Optional auth error:', error)
    }
  }

  await next()
}
