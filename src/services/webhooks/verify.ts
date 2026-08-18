import { createHmac, timingSafeEqual } from 'crypto'
import { getEnv } from '@/lib/env'

/** Verify Shopify webhook HMAC (base64 of sha256 over raw body). */
export function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  const secret = getEnv().SHOPIFY_WEBHOOK_SECRET
  if (!secret || !hmacHeader) return false
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  try {
    const a = Buffer.from(digest)
    const b = Buffer.from(hmacHeader)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** Verify Printify shared secret (Authorization Bearer or X-Printify-Secret). */
export function verifyPrintifyWebhookSecret(
  authorization: string | null,
  printifySecretHeader: string | null
): boolean {
  const secret = getEnv().PRINTIFY_WEBHOOK_SECRET
  if (!secret) return false
  const candidates = [
    authorization?.replace(/^Bearer\s+/i, '').trim(),
    printifySecretHeader?.trim(),
  ].filter(Boolean) as string[]
  return candidates.some((c) => {
    try {
      const a = Buffer.from(c)
      const b = Buffer.from(secret)
      if (a.length !== b.length) return false
      return timingSafeEqual(a, b)
    } catch {
      return false
    }
  })
}

export function isShopifyWebhookConfigured(): boolean {
  return Boolean(getEnv().SHOPIFY_WEBHOOK_SECRET)
}

export function isPrintifyWebhookConfigured(): boolean {
  return Boolean(getEnv().PRINTIFY_WEBHOOK_SECRET)
}
