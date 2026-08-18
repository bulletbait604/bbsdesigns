import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  verifyPrintifyWebhookSecret,
  isPrintifyWebhookConfigured,
} from '@/services/webhooks/verify'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isPrintifyWebhookConfigured()) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })
  }

  const auth = request.headers.get('authorization')
  const secretHeader = request.headers.get('x-printify-secret')
  if (!verifyPrintifyWebhookSecret(auth, secretHeader)) {
    logger.warn('printify_webhook_secret_failed')
    return NextResponse.json({ error: 'invalid_secret' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  logger.info('printify_webhook_verified', {
    type: (body as { type?: string }).type,
    resource: (body as { resource?: string }).resource,
  })

  return NextResponse.json({ ok: true })
}
