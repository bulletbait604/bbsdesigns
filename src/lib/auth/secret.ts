import { createHash, randomBytes } from 'crypto'
import { getEnv } from '@/lib/env'

/** Resolve a stable secret for signing sessions. */
export function getAuthSecret(): string {
  const env = getEnv()
  if (env.AUTH_SECRET && env.AUTH_SECRET.length >= 32) return env.AUTH_SECRET

  if (env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set (min 32 chars) in production')
  }

  // Deterministic local fallback so sessions survive restarts in development.
  return createHash('sha256')
    .update(`bbsdesigns-dev-auth|${env.APP_URL}`)
    .digest('hex')
}

export function generateAuthSecret(): string {
  return randomBytes(32).toString('hex')
}

export function generateSetupToken(): string {
  return randomBytes(24).toString('hex')
}
