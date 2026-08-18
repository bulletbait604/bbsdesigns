import { NextResponse } from 'next/server'
import { isMongoConfigured } from '@/lib/db'
import { isAdminPasswordSet } from '@/lib/auth/adminStore'
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
        message: 'Set MONGODB_URI, AUTH_SECRET, and ADMIN_SETUP_TOKEN before first admin setup.',
      })
    }

    const passwordSet = await isAdminPasswordSet()
    const session = await getSessionFromCookies()

    return NextResponse.json({
      ok: true,
      username: ADMIN_USERNAME,
      mongoConfigured: true,
      setupTokenConfigured: isSetupTokenConfigured(),
      authSecretReady,
      passwordSet,
      authenticated: Boolean(session),
      needsSetup: !passwordSet,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: toErrorMessage(error) }, { status: 500 })
  }
}
