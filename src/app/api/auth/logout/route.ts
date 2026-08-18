import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST() {
  await clearSessionCookie()
  logger.info('admin_logout')
  return NextResponse.json({ ok: true })
}
