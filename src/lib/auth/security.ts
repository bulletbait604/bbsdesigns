import { timingSafeEqual } from 'crypto'
import { getEnv } from '@/lib/env'
import { ADMIN_USERNAME } from '@/lib/auth/constants'
import { AppError } from '@/lib/errors'

/** Constant-time string compare (UTF-8). */
export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) {
    // Still compare against self to keep rough timing
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

export function isAdminUsername(username: string): boolean {
  return safeEqualString(username, ADMIN_USERNAME)
}

/** First-time setup requires a secret only you know from env — stops strangers claiming Admin. */
export function assertValidSetupToken(provided: string): void {
  const env = getEnv()
  const expected = env.ADMIN_SETUP_TOKEN || ''
  if (!expected || expected.length < 16) {
    throw new AppError(
      'ADMIN_SETUP_TOKEN is not configured. Add a long random value in Vercel env vars before first login.',
      { statusCode: 503, code: 'AUTH_SETUP_TOKEN_MISSING' }
    )
  }
  if (!safeEqualString(provided, expected)) {
    throw new AppError('Invalid setup token.', {
      statusCode: 403,
      code: 'AUTH_SETUP_TOKEN_INVALID',
    })
  }
}

export function isSetupTokenConfigured(): boolean {
  const token = getEnv().ADMIN_SETUP_TOKEN || ''
  return token.length >= 16
}

export function assertAuthSecretReady(): void {
  const env = getEnv()
  if (env.NODE_ENV === 'production' && (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)) {
    throw new AppError(
      'AUTH_SECRET must be set to a long random value (32+ chars) in production.',
      { statusCode: 503, code: 'AUTH_SECRET_REQUIRED' }
    )
  }
}
