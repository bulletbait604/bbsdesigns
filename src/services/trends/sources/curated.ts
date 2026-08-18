import type { Niche } from '@/types'
import { normalizeManualSignal } from '@/services/trends/normalize'
import type { NormalizedTrendSignal } from '@/services/trends/types'
import { VIRAL_ALGORITHM_VERSION } from '@/services/trends/viralAlgorithm'

type Seed = {
  niche: Niche
  title: string
  summary: string
  keywords: string[]
  hints?: NormalizedTrendSignal['hints']
}

/**
 * Viral Flash curated seeds — original humor + holiday/gift angles.
 * Replaces legacy seeds; IP trap retained for scoring regression.
 */
const SEEDS: Seed[] = [
  {
    niche: 'gaming',
    title: 'Halloween Gamer Humor Graphic Tee',
    summary:
      'Spooky-season gamer sarcasm for flashy bubble-type + mascot tees. Gift window: Aug–Oct.',
    keywords: ['gaming', 'halloween', 'funny', 'graphic', 'bubble', 'merch', 'gift'],
    hints: {
      virality: 86,
      growth: 82,
      commercialIntent: 88,
      audienceFit: 90,
      seasonality: 92,
      evergreenPotential: 48,
      competition: 52,
      ipRisk: 5,
      safetyRisk: 2,
      designability: 91,
      estimatedMargin: 74,
    },
  },
  {
    niche: 'gaming',
    title: 'Lag Lifestyle Streetwear Graphic',
    summary: 'Evergreen high-ping humor built for letter-as-icon / kinetic type flash designs.',
    keywords: ['gaming', 'lag', 'funny', 'streetwear', 'neon', 'merch'],
    hints: {
      virality: 80,
      growth: 74,
      commercialIntent: 84,
      audienceFit: 93,
      seasonality: 70,
      evergreenPotential: 86,
      competition: 55,
      ipRisk: 4,
      safetyRisk: 2,
      designability: 90,
      estimatedMargin: 72,
    },
  },
  {
    niche: 'baseball',
    title: 'Beer League Dad Gift Baseball Tee',
    summary: 'Father’s Day / season humor for arched varsity + bat-spark flash graphics.',
    keywords: ['baseball', "father's day", 'dad', 'beer league', 'funny', 'varsity', 'gift'],
    hints: {
      virality: 84,
      growth: 78,
      commercialIntent: 90,
      audienceFit: 92,
      seasonality: 88,
      evergreenPotential: 58,
      competition: 50,
      ipRisk: 4,
      safetyRisk: 1,
      designability: 92,
      estimatedMargin: 76,
    },
  },
  {
    niche: 'baseball',
    title: 'Swing At Bad Ideas Retro Graphic',
    summary: 'Sarcastic dugout humor with retro multi-color type energy.',
    keywords: ['baseball', 'funny', 'retro', 'swing', 'graphic', 'merch'],
    hints: {
      virality: 78,
      growth: 72,
      commercialIntent: 85,
      audienceFit: 90,
      seasonality: 80,
      evergreenPotential: 65,
      competition: 48,
      ipRisk: 3,
      safetyRisk: 1,
      designability: 91,
      estimatedMargin: 73,
    },
  },
  {
    niche: 'softball',
    title: 'Halloween Softball Mom Flash Tee',
    summary: 'Spooky tournament-mom sarcasm for prop-locked and kinetic flash merch.',
    keywords: ['softball', 'halloween', 'mom', 'funny', 'tournament', 'graphic', 'gift'],
    hints: {
      virality: 88,
      growth: 84,
      commercialIntent: 91,
      audienceFit: 94,
      seasonality: 90,
      evergreenPotential: 50,
      competition: 46,
      ipRisk: 2,
      safetyRisk: 1,
      designability: 93,
      estimatedMargin: 78,
    },
  },
  {
    niche: 'softball',
    title: 'Beer League Softball Dugout Graphic',
    summary: 'Adult rec softball identity humor — high flash-design fit, gift + season demand.',
    keywords: ['softball', 'beer league', 'dugout', 'funny', 'graphic', 'merch'],
    hints: {
      virality: 91,
      growth: 86,
      commercialIntent: 92,
      audienceFit: 96,
      seasonality: 82,
      evergreenPotential: 60,
      competition: 48,
      ipRisk: 2,
      safetyRisk: 1,
      designability: 94,
      estimatedMargin: 79,
    },
  },
  {
    niche: 'gaming',
    title: 'Official Mario Kart Championship Tee',
    summary: 'Looks like protected franchise merch and should score high IP risk.',
    keywords: ['mario', 'nintendo', 'kart', 'championship', 'official'],
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
      summary: `${seed.summary} [${VIRAL_ALGORITHM_VERSION}]`,
      keywords: seed.keywords,
      source: 'curated',
      externalId: `curated-v1-${seed.niche}-${seed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      hints: seed.hints,
    })
  )
}
