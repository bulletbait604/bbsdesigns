import { connectMongo, isMongoConfigured } from '@/lib/db'
import { AdminAuth } from '@/models/AdminAuth'
import {
  ADMIN_USERNAME,
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
} from '@/lib/auth/constants'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import {
  assertValidSetupToken,
  isAdminUsername,
  assertAuthSecretReady,
} from '@/lib/auth/security'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export function assertMongoForAuth(): void {
  if (!isMongoConfigured()) {
    throw new AppError(
      'MONGODB_URI is required for admin login. Add it in Vercel env vars, then redeploy.',
      { statusCode: 503, code: 'AUTH_MONGO_REQUIRED' }
    )
  }
}

export async function isAdminPasswordSet(): Promise<boolean> {
  assertMongoForAuth()
  await connectMongo()
  const doc = await AdminAuth.findOne({ username: ADMIN_USERNAME }).lean()
  return Boolean(doc?.passwordHash)
}

export async function setupAdminPassword(input: {
  password: string
  setupToken: string
}): Promise<void> {
  assertMongoForAuth()
  assertAuthSecretReady()
  assertValidSetupToken(input.setupToken)
  await connectMongo()

  const existing = await AdminAuth.findOne({ username: ADMIN_USERNAME })
  if (existing) {
    throw new AppError('Admin password is already set. Sign in instead.', {
      statusCode: 409,
      code: 'AUTH_ALREADY_SETUP',
    })
  }

  const passwordHash = await hashPassword(input.password)
  await AdminAuth.create({
    username: ADMIN_USERNAME,
    passwordHash,
    passwordSetAt: new Date(),
    failedAttempts: 0,
    lockedUntil: null,
  })

  logger.info('admin_password_setup_complete', { username: ADMIN_USERNAME })
}

function assertNotLocked(lockedUntil?: Date | null): void {
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
    throw new AppError(`Account locked. Try again in ~${mins} minute(s).`, {
      statusCode: 423,
      code: 'AUTH_LOCKED',
    })
  }
}

export async function verifyAdminLogin(username: string, password: string): Promise<boolean> {
  assertMongoForAuth()
  assertAuthSecretReady()

  // Always run a hash compare path length to reduce username oracle timing.
  if (!isAdminUsername(username)) {
    try {
      await verifyPassword(
        password,
        '$2b$14$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012'
      )
    } catch {
      // ignore — dummy compare for non-admin usernames
    }
    return false
  }

  await connectMongo()
  const doc = await AdminAuth.findOne({ username: ADMIN_USERNAME })
  if (!doc) {
    throw new AppError('Admin password has not been set yet. Complete first-time setup.', {
      statusCode: 409,
      code: 'AUTH_NOT_SETUP',
    })
  }

  assertNotLocked(doc.lockedUntil)

  const ok = await verifyPassword(password, doc.passwordHash)
  if (!ok) {
    const failedAttempts = (doc.failedAttempts || 0) + 1
    const update: Record<string, unknown> = {
      failedAttempts,
      lastFailedAt: new Date(),
    }
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
      update.failedAttempts = 0
      logger.warn('admin_login_locked', { username: ADMIN_USERNAME, minutes: LOCKOUT_MINUTES })
    }
    await AdminAuth.updateOne({ _id: doc._id }, { $set: update })
    return false
  }

  await AdminAuth.updateOne(
    { _id: doc._id },
    {
      $set: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    }
  )
  return true
}
