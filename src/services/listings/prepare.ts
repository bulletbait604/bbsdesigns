import type { Niche } from '@/types'

export type ListingDraft = {
  title: string
  description: string
  tags: string[]
  priceCents: number
  variantSkus: string[]
  mediaUrls: string[]
  niche: Niche
  slogan: string
  ideaId?: string
  designId?: string
}

/** Build a Shopify-ready draft listing from an approved idea + design. */
export function prepareListing(input: {
  niche: Niche
  slogan: string
  concept?: string
  mediaUrls: string[]
  ideaId?: string
  designId?: string
  priceCents?: number
}): ListingDraft {
  const titleBase = input.slogan.replace(/\.$/, '').trim()
  const title = `${titleBase} Tee`.slice(0, 120)
  const description = [
    `Original ${input.niche} humor merch.`,
    input.concept?.trim() || 'Funny, sarcastic, cheeky — made for people who get the joke.',
    'Printed on demand. Not affiliated with any game studio, league, or brand.',
  ].join(' ')

  const tags = Array.from(
    new Set([
      input.niche,
      'humor',
      'funny',
      'original',
      'print-on-demand',
      ...titleBase
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 4),
    ])
  ).slice(0, 13)

  return {
    title,
    description,
    tags,
    priceCents: input.priceCents ?? 2899,
    variantSkus: ['TEE-S', 'TEE-M', 'TEE-L', 'TEE-XL'],
    mediaUrls: input.mediaUrls.filter(Boolean),
    niche: input.niche,
    slogan: input.slogan,
    ideaId: input.ideaId,
    designId: input.designId,
  }
}
