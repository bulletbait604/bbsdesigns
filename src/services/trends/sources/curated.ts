import type { Niche } from '@/types'
import { normalizeManualSignal } from '@/services/trends/normalize'
import type { NormalizedTrendSignal } from '@/services/trends/types'

type Seed = {
  niche: Niche
  title: string
  summary: string
  keywords: string[]
  hints?: NormalizedTrendSignal['hints']
}

/**
 * Curated, original-humor seeds — permitted internal source (not scraped).
 * Used for local development and regression scoring samples.
 */
const SEEDS: Seed[] = [
  {
    niche: 'gaming',
    title: 'Lag is a Lifestyle',
    summary: 'Self-deprecating gamer humor about high ping and stubborn queue loyalty.',
    keywords: ['gaming', 'lag', 'queue', 'humor', 'merch'],
    hints: {
      virality: 72,
      growth: 68,
      commercialIntent: 80,
      audienceFit: 92,
      seasonality: 78,
      evergreenPotential: 85,
      competition: 55,
      ipRisk: 5,
      safetyRisk: 2,
      designability: 88,
      estimatedMargin: 70,
    },
  },
  {
    niche: 'baseball',
    title: 'I Only Swing at Bad Ideas',
    summary: 'Beer-league baseball joke about aggressive at-bats and questionable life choices.',
    keywords: ['baseball', 'swing', 'beer league', 'humor'],
    hints: {
      virality: 70,
      growth: 66,
      commercialIntent: 84,
      audienceFit: 90,
      seasonality: 86,
      evergreenPotential: 60,
      competition: 48,
      ipRisk: 4,
      safetyRisk: 1,
      designability: 90,
      estimatedMargin: 72,
    },
  },
  {
    niche: 'softball',
    title: 'Funny Beer League Softball',
    summary: 'Adult recreational softball culture: dugout jokes, sunburns, and post-game pizza.',
    keywords: ['softball', 'beer league', 'dugout', 'humor'],
    hints: {
      virality: 91,
      growth: 88,
      commercialIntent: 93,
      audienceFit: 96,
      seasonality: 84,
      evergreenPotential: 58,
      competition: 48,
      ipRisk: 2,
      safetyRisk: 1,
      designability: 92,
      estimatedMargin: 78,
    },
  },
  {
    niche: 'gaming',
    title: 'Official Mario Kart Championship Tee',
    summary: 'Looks like protected franchise merch and should score high IP risk.',
    keywords: ['mario', 'nintendo', 'kart', 'championship'],
    hints: {
      virality: 95,
      growth: 90,
      commercialIntent: 88,
      audienceFit: 80,
      competition: 70,
      ipRisk: 95,
      safetyRisk: 5,
      designability: 30,
    },
  },
]

export function fetchCuratedTrendSignals(niche?: Niche): NormalizedTrendSignal[] {
  return SEEDS.filter((s) => (niche ? s.niche === niche : true)).map((seed) =>
    normalizeManualSignal({
      niche: seed.niche,
      title: seed.title,
      summary: seed.summary,
      keywords: seed.keywords,
      source: 'curated',
      externalId: `curated-${seed.niche}-${seed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      hints: seed.hints,
    })
  )
}
