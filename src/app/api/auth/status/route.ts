import { NextResponse } from 'next/server'
import { isMongoConfigured } from '@/lib/db'
import { getAdminLockStatus, isAdminPasswordSet } from '@/lib/auth/adminStore'
import { getSessionFromCookies } from '@/lib/auth/session'
import { ADMIN_USERNAME } from '@/lib/auth/constants'
import { isSetupTokenConfigured } from '@/lib/auth/security'
import { getEnv } from '@/lib/env'
import { toErrorMessage } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const env = getEnv()
    const authSecretReady =
      env.NODE_ENV !== 'production' || Boolean(env.AUTH_SECRET && env.AUTH_SECRET.length >= 32)

    if (!isMongoConfigured()) {
      return NextResponse.json({
        ok: true,
        username: ADMIN_USERNAME,
        mongoConfigured: false,
        setupTokenConfigured: isSetupTokenConfigured(),
        authSecretReady,
        passwordSet: false,
        authenticated: false,
        needsSetup: false,
        locked: false,
        message: 'Set MONGODB_URI, AUTH_SECRET, and ADMIN_SETUP_TOKEN before first admin setup.',
      })
    }

    let passwordSet = false
    let locked = false
    let lockedUntil: string | null = null
    let mongoReachable = true
    let mongoError: string | undefined

    try {
      passwordSet = await isAdminPasswordSet()
      if (passwordSet) {
        const lock = await getAdminLockStatus()
        locked = lock.locked
        lockedUntil = lock.lockedUntil
      }
    } catch (error) {
      mongoReachable = false
      mongoError = toErrorMessage(error)
    }

    const session = mongoReachable ? await getSessionFromCookies() : null

    return NextResponse.json({
      ok: true,
      username: ADMIN_USERNAME,
      mongoConfigured: true,
      mongoReachable,
      mongoError,
      setupTokenConfigured: isSetupTokenConfigured(),
      authSecretReady,
      passwordSet,
      authenticated: Boolean(session),
      needsSetup: mongoReachable && !passwordSet,
      locked,
      lockedUntil,
      canResetWithSetupToken: isSetupTokenConfigured(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        username: ADMIN_USERNAME,
        mongoConfigured: isMongoConfigured(),
        authSecretReady: false,
        passwordSet: false,
        authenticated: false,
        needsSetup: false,
        error: toErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
