import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Order } from '@/models/Order'
import { ensureDefaultCatalog } from '@/services/catalog/defaults'
import { verifyShopifyWebhookHmac, isShopifyWebhookConfigured } from '@/services/webhooks/verify'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isShopifyWebhookConfigured()) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    logger.warn('shopify_webhook_hmac_failed')
    return NextResponse.json({ error: 'invalid_hmac' }, { status: 401 })
  }

  const topic = request.headers.get('x-shopify-topic') || 'unknown'
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  logger.info('shopify_webhook_verified', {
    topic,
    id: payload.id,
  })

  if (topic.startsWith('orders/') && isMongoConfigured()) {
    try {
      await connectMongo()
      const catalog = await ensureDefaultCatalog()
      if (catalog && payload.id != null) {
        const financial = String(payload.financial_status || '').toLowerCase()
        const status =
          financial === 'refunded'
            ? 'refunded'
            : String(payload.cancelled_at || '') 
              ? 'cancelled'
              : String(payload.fulfillment_status || '').toLowerCase() === 'fulfilled'
                ? 'fulfilled'
                : 'open'

        await Order.findOneAndUpdate(
          { shopifyOrderId: String(payload.id) },
          {
            storeId: catalog.storeId,
            shopifyOrderId: String(payload.id),
            status,
            totalCents: Math.round(Number(payload.total_price || 0) * 100) || 0,
            currency: String(payload.currency || 'USD'),
            lineItems: Array.isArray(payload.line_items) ? payload.line_items : [],
            orderedAt: payload.created_at ? new Date(String(payload.created_at)) : new Date(),
          },
          { upsert: true, new: true }
        )
      }
    } catch (error) {
      logger.error('shopify_webhook_order_persist_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({ ok: true, topic })
}
