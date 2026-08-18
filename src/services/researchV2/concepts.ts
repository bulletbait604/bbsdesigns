import type { Niche } from '@/lib/niches'
import { recommendStylesForNiche, type DesignStyleId } from '@/services/researchV2/styleLibrary'
import type { ConceptCombination, TrendCluster } from '@/services/researchV2/types'

const AUDIENCES: Record<string, string[]> = {
  gaming: ['18-35 gamers', 'streamers', 'retro gamers', 'co-op couples'],
  baseball: ['beer-league dads', 'travel-ball parents', 'weekend fans'],
  softball: ['tournament moms', 'high-school athletes', 'team parents'],
  pets: ['cat moms', 'dog dads', 'chaotic pet parents'],
  teacher: ['elementary teachers', 'new teachers', 'teacher besties'],
  nurse: ['night-shift nurses', 'ER teams', 'nursing students'],
  humor: ['sarcasm fans', 'gift buyers', 'office humor'],
  retro: ['Y2K nostalgia', 'millennials', 'festival fashion'],
  bookish: ['readers', 'book club', 'dark academia light'],
}

const HUMOR: Record<string, string[]> = {
  gaming: ['lag rage', 'one more game', 'controller rage', 'afk sarcasm'],
  baseball: ['dad humor', 'bench warmth', 'foul ball chaos', 'umpire sarcasm'],
  softball: ['dirt diamond pride', 'tournament snack humor', 'cleat chaos'],
  pets: ['house takeover', 'zoomies', 'judgey stare', 'pet tax'],
  teacher: ['coffee survival', 'glue stick chaos', 'recess referee'],
  nurse: ['caffeine IV', 'night shift comedy', 'charting sarcasm'],
  humor: ['deadpan', 'literally me', 'overly honest'],
  retro: ['cassette nostalgia', 'dial-up trauma', 'Y2K flex'],
  bookish: ['plot twist addiction', 'TBR guilt', 'fictional men'],
}

const PRODUCTS = ['tshirt', 'hoodie', 'mug', 'sticker', 'hat', 'tote', 'poster'] as const

function hashSeed(s: string): number {
  return [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
}

export function buildTrendCluster(parentTrend: string, niche: Niche): TrendCluster {
  const base = parentTrend.replace(/\b(shirt|tee|hoodie|mug|gift)\b/gi, '').trim() || parentTrend
  const templates: Record<string, string[]> = {
    pets: ['attitude', 'mom', 'dad', 'chaotic', 'sleepy', 'coffee', 'wine', 'at work', 'gaming'],
    gaming: ['rage', 'co-op', 'retro', 'night owl', 'controller', 'lag'],
    baseball: ['dad', 'beer league', 'opening day', 'playoffs', 'snack'],
    softball: ['tournament', 'dirt', 'team mom', 'travel ball'],
    teacher: ['coffee', 'chaos', 'first day', 'summer'],
    nurse: ['night shift', 'coffee', 'team', 'scrubs humor'],
    humor: ['office', 'gift', 'sarcasm', 'relatable'],
    retro: ['Y2K', 'neon', 'arcade', 'cassette'],
    bookish: ['TBR', 'book club', 'cozy', 'plot twist'],
  }
  const suffixes = templates[niche] || templates.humor
  const subTrends = suffixes.map((s) => `${base} ${s}`.trim()).slice(0, 8)
  return {
    id: `cluster:${niche}:${base.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`,
    parentTrend: base,
    niche,
    subTrends,
    audiences: AUDIENCES[niche] || AUDIENCES.humor,
    products: [...PRODUCTS].slice(0, 5),
    designDirections: recommendStylesForNiche(niche, 5).map((s) => s.label),
  }
}

export function generateConceptCombinations(input: {
  topic: string
  niche: Niche
  limit?: number
}): ConceptCombination[] {
  const limit = input.limit ?? 10
  const audiences = AUDIENCES[input.niche] || AUDIENCES.humor
  const humors = HUMOR[input.niche] || HUMOR.humor
  const styles = recommendStylesForNiche(input.niche, 6)
  const products = [...PRODUCTS]
  const out: ConceptCombination[] = []
  const seed = hashSeed(`${input.niche}:${input.topic}`)

  for (let i = 0; i < limit; i++) {
    const audience = audiences[(seed + i) % audiences.length]
    const humor = humors[(seed + i * 3) % humors.length]
    const product = products[(seed + i * 5) % products.length]
    const style = styles[i % styles.length]
    const primary =
      i % 3 === 0
        ? `${input.topic.split(/\s+/).slice(0, 3).join(' ').toUpperCase()}`
        : humor.toUpperCase().slice(0, 28)
    const secondary =
      i % 2 === 0 ? `For the ${audience.split(' ')[0]} crowd` : 'Original merch energy'
    const visualStory = [
      `Oversized original illustration for "${input.topic}"`,
      `humor angle: ${humor}`,
      `style: ${style.label}`,
      `composition with layered typography integrated into the art`,
      `never plain text-only, never clip-art collage of protected IP`,
    ].join('. ')

    const recommendedStyleScore = clampScore(
      55 + (style.bestFor.includes(input.niche) ? 30 : 10) + (i === 0 ? 5 : 0)
    )
    const conceptScore = clampScore(
      recommendedStyleScore * 0.45 +
        (product === 'tshirt' || product === 'hoodie' ? 20 : 12) +
        (humor.length > 6 ? 15 : 8) +
        (i < 3 ? 8 : 0)
    )

    out.push({
      id: `concept:${input.niche}:${i}:${seed}`,
      trend: input.topic,
      audience,
      humor,
      product,
      visualStyle: style.id,
      niche: input.niche,
      headline: `${style.label} direction for ${input.topic}`,
      primaryText: sanitizePrimary(primary, input.topic, humor),
      secondaryText: secondary,
      visualStory,
      recommendedStyleId: style.id as DesignStyleId,
      recommendedStyleScore,
      conceptScore,
    })
  }

  return out.sort((a, b) => b.conceptScore - a.conceptScore)
}

function sanitizePrimary(raw: string, topic: string, humor: string): string {
  const cleaned = raw.replace(/[^A-Z0-9\s'!?.]/gi, '').trim()
  if (cleaned.length >= 4 && cleaned.length <= 36) return cleaned
  const fallback = humor.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 28)
  return fallback || topic.split(/\s+/).slice(0, 4).join(' ').toUpperCase()
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function recommendProductsForConcept(concept: ConceptCombination): string[] {
  const niche = concept.niche
  if (niche === 'pets') return ['mug', 'sticker', 'hoodie', 'tshirt']
  if (niche === 'baseball' || niche === 'softball') return ['tshirt', 'hoodie', 'hat']
  if (niche === 'gaming') return ['tshirt', 'hoodie', 'mug']
  if (concept.product === 'mug') return ['mug', 'sticker', 'tshirt']
  return [concept.product, 'tshirt', 'hoodie'].filter((v, i, a) => a.indexOf(v) === i)
}
