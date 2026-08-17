import { afterEach, describe, expect, it } from 'vitest'
import {
  approvePublishingItem,
  clearPublishingQueue,
  enqueuePublishingCandidate,
  processPublishingItem,
  validateReadyForReview,
} from '@/services/publishing/queue'
import { resetEnvCache } from '@/lib/env'

const goodCandidate = {
  title: 'Lag Is A Lifestyle Tee',
  description: 'Original funny gaming humor apparel.',
  tags: ['gaming', 'humor'],
  priceCents: 2999,
  mediaUrls: ['https://cdn.example.com/lag.png'],
  variantSkus: ['LAG-S', 'LAG-M'],
  sloganSafety: 'PASS' as const,
  imageSafety: 'PASS' as const,
  qualityScore: 90,
}

describe('publishing queue', () => {
  afterEach(() => {
    clearPublishingQueue()
    resetEnvCache()
  })

  it('marks READY_FOR_REVIEW only when all gates pass', () => {
    expect(validateReadyForReview(goodCandidate)).toEqual([])
    const item = enqueuePublishingCandidate(goodCandidate)
    expect(item.status).toBe('READY_FOR_REVIEW')
  })

  it('rejects when safety is REJECT', () => {
    const item = enqueuePublishingCandidate({
      ...goodCandidate,
      sloganSafety: 'REJECT',
      idempotencyKey: 'rej-1',
    })
    expect(item.status).toBe('REJECTED')
  })

  it('stays DRAFT when missing media/price/variants', () => {
    const item = enqueuePublishingCandidate({
      ...goodCandidate,
      mediaUrls: [],
      priceCents: 0,
      variantSkus: [],
      idempotencyKey: 'draft-1',
    })
    expect(item.status).toBe('DRAFT')
    expect(item.validationErrors.length).toBeGreaterThan(0)
  })

  it('is idempotent on enqueue and supports approve + process with retry metadata', async () => {
    const a = enqueuePublishingCandidate({ ...goodCandidate, idempotencyKey: 'idem-9' })
    const b = enqueuePublishingCandidate({ ...goodCandidate, idempotencyKey: 'idem-9' })
    expect(a.id).toBe(b.id)

    const approved = approvePublishingItem('idem-9')
    expect(approved.status).toBe('APPROVED')

    const published = await processPublishingItem('idem-9', {
      createShopifyDraft: async () => ({ id: 'gid://shopify/Product/1' }),
      syncPrintify: async () => ({ id: 'printify-1' }),
    })
    expect(published.status).toBe('PUBLISHED')
    expect(published.attempts).toBe(1)
    expect(published.payload.tags.some((t) => t.startsWith('shopify:'))).toBe(true)
  })
})
