import { NextResponse } from 'next/server'
import { ADMIN_USERNAME } from '@/lib/auth/constants'
import { validateNewPassword } from '@/lib/auth/password'
import { resetAdminPasswordWithSetupToken } from '@/lib/auth/adminStore'
import { attachSessionCookie, createSessionToken } from '@/lib/auth/session'
import { clientIp, rateLimit } from '@/lib/auth/rateLimit'
import { AppError, toErrorMessage } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * Unlock / forgot-password using ADMIN_SETUP_TOKEN from Vercel.
 * Replaces the Admin password and clears lockouts.
 */
export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    const limited = rateLimit(`reset:${ip}`, 5, 15 * 60_000)
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: `Too many reset attempts. Retry in ${limited.retryAfterSec}s.` },
        { status: 429 }
      )
    }

    const body = (await request.json()) as {
      password?: string
      confirmPassword?: string
      setupToken?: string
    }

    const password = body.password || ''
    const confirm = body.confirmPassword || ''
    const validationError = validateNewPassword(password, confirm)
    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 })
    }

    await resetAdminPasswordWithSetupToken({
      password,
      setupToken: body.setupToken || '',
    })

    const token = await createSessionToken({ username: ADMIN_USERNAME, role: 'admin' })
    const response = NextResponse.json({ ok: true, username: ADMIN_USERNAME, reset: true })
    return attachSessionCookie(response, token)
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500
    return NextResponse.json({ ok: false, error: toErrorMessage(error) }, { status })
  }
}
