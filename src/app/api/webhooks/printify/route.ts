import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Order } from '@/models/Order'
import {
  verifyPrintifyWebhookSecret,
  isPrintifyWebhookConfigured,
} from '@/services/webhooks/verify'

export const dynamic = 'force-dynamic'

function mapPrintifyStatus(raw: unknown): 'open' | 'fulfilled' | 'cancelled' | 'refunded' | null {
  const value = String(raw || '').toLowerCase()
  if (!value) return null
  if (value.includes('cancel')) return 'cancelled'
  if (value.includes('refund')) return 'refunded'
  if (
    value.includes('fulfill') ||
    value.includes('ship') ||
    value.includes('deliver') ||
    value === 'completed' ||
    value === 'done'
  ) {
    return 'fulfilled'
  }
  if (value.includes('open') || value.includes('pending') || value.includes('in-production')) {
    return 'open'
  }
  return null
}

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

  const body = (await request.json().catch(() => ({}))) as {
    type?: string
    resource?: string
    data?: {
      id?: string | number
      status?: string
      metadata?: { shopify_order_id?: string; order_id?: string }
    }
  }

  let updated = 0
  if (isMongoConfigured()) {
    try {
      await connectMongo()
      const printifyId = body.data?.id != null ? String(body.data.id) : ''
      const shopifyOrderId =
        body.data?.metadata?.shopify_order_id || body.data?.metadata?.order_id || ''
      const status = mapPrintifyStatus(body.data?.status)

      if (printifyId || shopifyOrderId) {
        const filter = printifyId
          ? { printifyOrderId: printifyId }
          : { shopifyOrderId: String(shopifyOrderId) }
        const update: Record<string, unknown> = {}
        if (printifyId) update.printifyOrderId = printifyId
        if (status) update.status = status
        if (Object.keys(update).length) {
          const result = await Order.findOneAndUpdate(filter, { $set: update }, { new: true })
          if (result) updated = 1
        }
      }
    } catch (error) {
      logger.error('printify_webhook_persist_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  logger.info('printify_webhook_verified', {
    type: body.type,
    resource: body.resource,
    updated,
  })

  return NextResponse.json({ ok: true, updated })
}
