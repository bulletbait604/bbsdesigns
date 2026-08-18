import { describe, expect, it } from 'vitest'
import { prepareListing } from '@/services/listings/prepare'
import { buildLiveMerchDesign } from '@/lib/svgMerch'
import { enqueueJob, clearAutomationMemory } from '@/services/automation'
import { resetEnvCache } from '@/lib/env'

describe('live pipeline (019)', () => {
  it('prepareListing builds title tags variants and media', () => {
    const listing = prepareListing({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept: 'High ping loyalty',
      mediaUrls: ['/api/design-preview?slogan=x&niche=gaming'],
    })
    expect(listing.title).toContain('Lag Is A Lifestyle')
    expect(listing.tags).toContain('gaming')
    expect(listing.variantSkus.length).toBeGreaterThan(0)
    expect(listing.priceCents).toBeGreaterThan(0)
  })

  it('buildLiveMerchDesign picks niche palette', () => {
    const d = buildLiveMerchDesign({ slogan: 'Sunburnt. Competitive.', niche: 'softball' })
    expect(d.niche).toBe('softball')
    expect(d.palette.accent).toBeTruthy()
  })

  it('idea_generation job succeeds without mongo (no stub flag)', async () => {
    clearAutomationMemory()
    resetEnvCache()
    delete process.env.MONGODB_URI
    resetEnvCache()

    const run = await enqueueJob({
      jobName: 'idea_generation',
      idempotencyKey: `idea-live-${Date.now()}`,
      force: true,
    })
    expect(run.status).toBe('succeeded')
    expect(run.stats?.stub).not.toBe(true)
    expect(Number(run.stats?.generated ?? 0)).toBeGreaterThan(0)
  })
})
