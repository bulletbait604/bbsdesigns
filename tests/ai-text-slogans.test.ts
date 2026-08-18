import { describe, expect, it, afterEach } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import {
  generateSloganCandidates,
  generateSloganCandidatesSync,
  isWeakSlogan,
  SLOGAN_PROMPT_VERSION,
} from '@/services/slogans/generate'
import { scoreSlogan, MIN_SLOGAN_OVERALL } from '@/services/slogans/score'
import { bootstrapProviders } from '@/providers/bootstrap'
import { clearProviders } from '@/providers/registry'
import { createGoogleTextProvider } from '@/providers/text/google'

describe('ai text slogans (023)', () => {
  afterEach(() => {
    clearProviders()
    resetEnvCache()
    delete process.env.AI_TEXT_API_KEY
    delete process.env.GEMINI_API
  })

  it('falls back to templates when AI is stub', async () => {
    clearProviders()
    bootstrapProviders()
    const rows = await generateSloganCandidates({ niche: 'gaming', limit: 2 })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.slogan.length > 3)).toBe(true)
    expect(rows.every((r) => r.concept.toLowerCase().includes('visual'))).toBe(true)
  })

  it('sync template helper still works', () => {
    const rows = generateSloganCandidatesSync({ niche: 'softball', limit: 2 })
    expect(rows[0]?.source).toBe('template')
    expect(SLOGAN_PROMPT_VERSION).toContain('v3')
  })

  it('rejects weak cringe slogans', () => {
    expect(isWeakSlogan('Gamer Mode: Activated')).toBe(true)
    expect(isWeakSlogan("It's giving main character")).toBe(true)
    expect(isWeakSlogan('Lag Is A Lifestyle')).toBe(false)
    const weak = scoreSlogan({ slogan: 'Vibes Only', niche: 'gaming' })
    expect(weak.overall).toBeLessThan(MIN_SLOGAN_OVERALL)
    const strong = scoreSlogan({ slogan: 'I Only Swing At Bad Ideas', niche: 'baseball' })
    expect(strong.overall).toBeGreaterThanOrEqual(MIN_SLOGAN_OVERALL)
  })

  it('google text provider validateConfig respects key', () => {
    resetEnvCache()
    const provider = createGoogleTextProvider()
    expect(provider.validateConfig().ok).toBe(false)
    process.env.GEMINI_API = 'test-key'
    resetEnvCache()
    expect(createGoogleTextProvider().validateConfig().ok).toBe(true)
  })
})
