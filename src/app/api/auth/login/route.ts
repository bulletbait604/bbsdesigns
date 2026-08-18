import { NextResponse } from 'next/server'
import { ADMIN_USERNAME } from '@/lib/auth/constants'
import { verifyAdminLogin } from '@/lib/auth/adminStore'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'
import { clientIp, rateLimit } from '@/lib/auth/rateLimit'
import { AppError, toErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const ip = clientIp(request)
    const limited = rateLimit(`login:${ip}`, 20, 15 * 60_000)
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: `Too many login attempts. Retry in ${limited.retryAfterSec}s.` },
        { status: 429 }
      )
    }

    const body = (await request.json()) as { username?: string; password?: string }
    const username = body.username || ''
    const password = body.password || ''

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Username and password required' }, { status: 400 })
    }

    const ok = await verifyAdminLogin(username, password)
    if (!ok) {
      logger.warn('admin_login_failed', { ip })
      return NextResponse.json({ ok: false, error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await createSessionToken({ username: ADMIN_USERNAME, role: 'admin' })
    await setSessionCookie(token)
    logger.info('admin_login_success', { ip })

    return NextResponse.json({ ok: true, username: ADMIN_USERNAME })
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500
    return NextResponse.json({ ok: false, error: toErrorMessage(error) }, { status })
  }
}
