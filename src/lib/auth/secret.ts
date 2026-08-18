import { createHash, randomBytes } from 'crypto'
import { getEnv } from '@/lib/env'

/** Resolve a stable secret for signing sessions. */
export function getAuthSecret(): string {
  const env = getEnv()
  const fromEnv = (env.AUTH_SECRET || process.env.AUTH_SECRET || '').trim()
  if (fromEnv.length >= 32) return fromEnv

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
