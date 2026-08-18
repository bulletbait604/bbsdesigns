import { describe, expect, it } from 'vitest'
import { buildDesignPrompt } from '@/services/designs/prompt'
import { runDesignEngine } from '@/services/designs/engine'
import { composeGraphicWithSlogan, splitSloganLines } from '@/services/designs/composeMerch'
import { bootstrapProviders } from '@/providers/bootstrap'
import { clearProviders } from '@/providers/registry'

describe('design engine', () => {
  it('builds art-only prompts (typography composited later) with IP limits', () => {
    const built = buildDesignPrompt({
      niche: 'gaming',
      slogan: 'Lag Is A Lifestyle',
      concept:
        'Self-roast. Visual: chubby cartoon Wi-Fi ghost dripping delay clocks, neon outline.',
    })
    expect(built.promptVersion).toContain('graphic-plus-type')
    expect(built.prompt.toLowerCase()).toContain('no logos')
    expect(built.prompt.toLowerCase()).toContain('no copyrighted characters')
    expect(built.prompt.toLowerCase()).toContain('no celebrity')
    expect(built.prompt.toLowerCase()).toContain('subject')
    expect(built.prompt.toLowerCase()).toContain('wi-fi ghost')
    expect(built.prompt.toLowerCase()).toContain('zero letters')
    expect(built.prompt.toLowerCase()).toContain('illustrated')
    expect(built.negativePrompt.toLowerCase()).toMatch(/text|letters|typography/)
  })

  it('composites AI graphic with clean slogan typography', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    const composed = await composeGraphicWithSlogan({
      artBytes: png,
      slogan: 'Lag Is A Lifestyle',
      niche: 'gaming',
      size: 512,
    })
    expect(composed.mimeType).toBe('image/png')
    expect(composed.width).toBe(512)
    expect(composed.bytes.length).toBeGreaterThan(png.length)
    expect(splitSloganLines('Sunburnt. Competitive. Still Here.').length).toBeGreaterThanOrEqual(2)
  })

  it('stores provider/model/prompt provenance and never allows publish', async () => {
    clearProviders()
    bootstrapProviders()

    const result = await runDesignEngine({
      niche: 'softball',
      slogan: 'Sunburnt. Competitive. Still Here.',
      concept: 'Visual: sun-blasted catcher mitt with sunglasses',
      ideaId: 'idea-demo-1',
    })

    expect(result.design.provider).toBeTruthy()
    expect(result.design.model).toContain('compose-typo')
    expect(result.design.prompt).toContain('Sunburnt')
    expect(result.design.promptVersion).toContain('graphic-plus-type')
    expect(result.design.sourceIdeaId).toBe('idea-demo-1')
    expect(result.design.assetUrl).toBeTruthy()
    expect(result.design.width).toBe(2048)
    expect(result.design.mimeType).toBe('image/png')
    expect(result.design.createdAt).toBeTruthy()
    expect(result.publishAllowed).toBe(false)
    expect(result.review.decision).not.toBeUndefined()
    expect(result.bytes.length).toBeGreaterThan(100)
  })
})
