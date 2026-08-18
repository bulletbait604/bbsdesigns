import { describe, expect, it, afterEach } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import { generateSloganCandidates, generateSloganCandidatesSync } from '@/services/slogans/generate'
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
  })

  it('sync template helper still works', () => {
    const rows = generateSloganCandidatesSync({ niche: 'softball', limit: 2 })
    expect(rows[0]?.source).toBe('template')
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
