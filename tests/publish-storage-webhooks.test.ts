import { createHmac } from 'crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import {
  verifyShopifyWebhookHmac,
  verifyPrintifyWebhookSecret,
} from '@/services/webhooks/verify'
import { toAbsoluteMediaUrl, enqueueListingForDraft } from '@/services/publishing/draftFromApproval'
import { clearPublishingQueue } from '@/services/publishing/queue'
import { createR2StorageProvider } from '@/providers/storage/r2'

describe('r2 storage provider', () => {
  afterEach(() => {
    resetEnvCache()
    delete process.env.R2_ACCOUNT_ID
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_BUCKET_NAME
    delete process.env.R2_PUBLIC_URL
  })

  it('validateConfig fails when env missing', () => {
    resetEnvCache()
    const provider = createR2StorageProvider()
    const v = provider.validateConfig()
    expect(v.ok).toBe(false)
    expect(v.missing.length).toBeGreaterThan(0)
  })

  it('getPublicUrl joins R2_PUBLIC_URL and key', () => {
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET_NAME = 'bucket'
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com'
    resetEnvCache()
    const provider = createR2StorageProvider()
    expect(provider.validateConfig().ok).toBe(true)
    expect(provider.getPublicUrl('designs/a.png')).toBe('https://cdn.example.com/designs/a.png')
  })
})

describe('webhook verification', () => {
  afterEach(() => {
    resetEnvCache()
    delete process.env.SHOPIFY_WEBHOOK_SECRET
    delete process.env.PRINTIFY_WEBHOOK_SECRET
  })

  it('verifies shopify hmac', () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = 'shhh'
    resetEnvCache()
    const body = '{"id":1}'
    const hmac = createHmac('sha256', 'shhh').update(body, 'utf8').digest('base64')
    expect(verifyShopifyWebhookHmac(body, hmac)).toBe(true)
    expect(verifyShopifyWebhookHmac(body, 'bad')).toBe(false)
  })

  it('verifies printify shared secret', () => {
    process.env.PRINTIFY_WEBHOOK_SECRET = 'print-secret'
    resetEnvCache()
    expect(verifyPrintifyWebhookSecret('Bearer print-secret', null)).toBe(true)
    expect(verifyPrintifyWebhookSecret(null, 'print-secret')).toBe(true)
    expect(verifyPrintifyWebhookSecret('Bearer wrong', null)).toBe(false)
  })
})

describe('draft from approval helpers', () => {
  afterEach(() => {
    clearPublishingQueue()
    resetEnvCache()
  })

  it('toAbsoluteMediaUrl prefixes APP_URL', () => {
    process.env.APP_URL = 'https://bbs.example.com'
    resetEnvCache()
    expect(toAbsoluteMediaUrl('/api/design-preview?x=1')).toBe(
      'https://bbs.example.com/api/design-preview?x=1'
    )
    expect(toAbsoluteMediaUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png'
    )
  })

  it('enqueueListingForDraft creates READY or DRAFT queue item', () => {
    clearPublishingQueue()
    const item = enqueueListingForDraft({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept: 'ping joke',
      mediaUrls: ['https://cdn.example.com/art.png'],
      sloganSafety: 'PASS',
      imageSafety: 'PASS',
      qualityScore: 90,
      ideaId: 'idea1',
      designId: 'design1',
    })
    expect(item.status).toBe('READY_FOR_REVIEW')
    expect(item.payload.mediaUrls[0]).toMatch(/^https?:\/\//)
  })
})
