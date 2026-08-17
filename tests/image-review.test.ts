import { describe, expect, it } from 'vitest'
import { reviewGeneratedImage } from '@/services/designs/imageReview'
import { buildDesignPrompt } from '@/services/designs/prompt'

describe('image review', () => {
  it('PASSes clean high-quality stub assets at or above threshold', () => {
    const built = buildDesignPrompt({
      niche: 'baseball',
      slogan: 'I Only Swing At Bad Ideas',
    })
    const review = reviewGeneratedImage({
      slogan: 'I Only Swing At Bad Ideas',
      prompt: built.prompt,
      niche: 'baseball',
      bytesLength: 2048,
      mimeType: 'image/png',
      minQuality: 85,
    })
    expect(review.qualityScore).toBeGreaterThanOrEqual(85)
    expect(review.decision).toBe('PASS')
    expect(review.disclaimer).toContain('not legal clearance')
  })

  it('REJECTs obvious IP-like slogans in image context', () => {
    const review = reviewGeneratedImage({
      slogan: 'Official Mario Kart Championship',
      prompt: 'mario nintendo character art',
      niche: 'gaming',
      bytesLength: 2048,
      mimeType: 'image/png',
      minQuality: 85,
    })
    expect(review.decision).toBe('REJECT')
    expect(review.ipRisk).toBeGreaterThanOrEqual(50)
  })

  it('REVIEWs uncertain near-threshold quality and never auto-publishes', () => {
    const review = reviewGeneratedImage({
      slogan: 'Sunburnt. Competitive. Still Here.',
      prompt: 'original artwork, no logos, print ready',
      niche: 'softball',
      bytesLength: 10,
      mimeType: 'image/png',
      minQuality: 85,
    })
    expect(['REVIEW', 'REJECT']).toContain(review.decision)
    expect(review.issues.length).toBeGreaterThan(0)
  })
})
