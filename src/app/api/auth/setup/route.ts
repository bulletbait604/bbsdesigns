import { NextResponse } from 'next/server'
import { ADMIN_USERNAME } from '@/lib/auth/constants'
import { validateNewPassword } from '@/lib/auth/password'
import { setupAdminPassword } from '@/lib/auth/adminStore'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'
import { isAdminUsername } from '@/lib/auth/security'
import { clientIp, rateLimit } from '@/lib/auth/rateLimit'
import { AppError, toErrorMessage } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    const limited = rateLimit(`setup:${ip}`, 5, 15 * 60_000)
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: `Too many setup attempts. Retry in ${limited.retryAfterSec}s.` },
        { status: 429 }
      )
    }

    const body = (await request.json()) as {
      username?: string
      password?: string
      confirmPassword?: string
      setupToken?: string
    }

    if (!isAdminUsername(body.username || '')) {
      return NextResponse.json(
        { ok: false, error: `Username must be exactly ${ADMIN_USERNAME}` },
        { status: 400 }
      )
    }

    const password = body.password || ''
    const confirm = body.confirmPassword || ''
    const validationError = validateNewPassword(password, confirm)
    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 })
    }

    await setupAdminPassword({
      password,
      setupToken: body.setupToken || '',
    })

    const token = await createSessionToken({ username: ADMIN_USERNAME, role: 'admin' })
    await setSessionCookie(token)

    return NextResponse.json({ ok: true, username: ADMIN_USERNAME })
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500
    return NextResponse.json({ ok: false, error: toErrorMessage(error) }, { status })
  }
}
