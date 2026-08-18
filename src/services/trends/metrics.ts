import type { Niche } from '@/types'
import type { NormalizedTrendSignal, TrendMetricComponents } from '@/services/trends/types'
import {
  holidayBoostForText,
  scoreFlashDesignFit,
  scoreIdentitySpecificity,
  VIRAL_ALGORITHM_VERSION,
} from '@/services/trends/viralAlgorithm'

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

const NICHE_KEYWORDS: Record<Niche, string[]> = {
  gaming: [
    'game',
    'gamer',
    'console',
    'pc',
    'lag',
    'raid',
    'pixel',
    'controller',
    'stream',
    'respawn',
    'queue',
  ],
  baseball: [
    'baseball',
    'bat',
    'pitch',
    'diamond',
    'inning',
    'homer',
    'catcher',
    'beer league',
    'dugout',
  ],
  softball: [
    'softball',
    'cleat',
    'dugout',
    'beer league',
    'fastpitch',
    'slowpitch',
    'plate',
    'tournament',
  ],
  pets: ['dog', 'cat', 'pet', 'puppy', 'kitten', 'dog mom', 'cat mom', 'paw'],
  teacher: ['teacher', 'classroom', 'educator', 'glue stick', 'school', 'principal'],
  nurse: ['nurse', 'scrubs', 'stethoscope', 'healthcare', 'rn', 'shift'],
  humor: ['funny', 'sarcastic', 'viral', 'tiktok', 'joke', 'humor', 'snacks'],
  retro: ['retro', 'vintage', 'y2k', '90s', '80s', 'neon', 'bubble'],
  bookish: ['book', 'reader', 'library', 'novel', 'chapter', 'bookish'],
}

const IP_RISK_TERMS = [
  'nintendo',
  'pokemon',
  'mario',
  'zelda',
  'fortnite',
  'minecraft',
  'disney',
  'marvel',
  'nba',
  'nfl',
  'mlb logo',
  'yankees',
  'dodgers',
  'celebrity',
]

const SAFETY_RISK_TERMS = ['kill', 'slur', 'hate', 'nazi', 'rape', 'suicide', 'terror']

function keywordHits(text: string, terms: string[]): number {
  const lower = text.toLowerCase()
  return terms.reduce((acc, t) => (lower.includes(t) ? acc + 1 : acc), 0)
}

/**
 * Viral Flash metric estimation (algorithm VIRAL_ALGORITHM_VERSION).
 * Folds holiday + flash-design fit into seasonality / commercial / designability.
 */
export function estimateMetrics(signal: NormalizedTrendSignal): TrendMetricComponents & {
  ipRisk: number
  safetyRisk: number
  designability: number
  estimatedMargin: number
  flashDesignFit: number
  holidayBoost: number
  algorithmVersion: string
} {
  const text = `${signal.title} ${signal.summary} ${signal.keywords.join(' ')}`
  const nicheHits = keywordHits(text, NICHE_KEYWORDS[signal.niche])
  const identityFit = scoreIdentitySpecificity(text, signal.niche)
  const audienceFit = clamp(
    signal.hints?.audienceFit ?? Math.round(50 + nicheHits * 10 + identityFit * 0.25)
  )

  const flashDesignFit = clamp(signal.hints?.designability ?? scoreFlashDesignFit(text))
  const holiday = holidayBoostForText(text, signal.niche, signal.observedAt)

  const virality = clamp(
    signal.hints?.virality ??
      42 + Math.min(28, signal.keywords.length * 4) + flashDesignFit * 0.15 + identityFit * 0.08
  )
  const growth = clamp(signal.hints?.growth ?? Math.max(38, virality - 6 + holiday.matched.length * 4))

  const commercialIntent = clamp(
    signal.hints?.commercialIntent ??
      48 +
        (/\b(shirt|tee|t-shirt|merch|hoodie)\b/i.test(text) ? 18 : 8) +
        flashDesignFit * 0.12 +
        holiday.matched.length * 5 +
        identityFit * 0.1
  )

  const seasonality = clamp(
    signal.hints?.seasonality ?? Math.max(holiday.score, 40 + holiday.matched.length * 10)
  )

  const evergreenPotential = clamp(
    signal.hints?.evergreenPotential ??
      (holiday.matched.length ? 45 : 70) + (flashDesignFit > 70 ? 10 : 0)
  )

  const competition = clamp(signal.hints?.competition ?? 42 + nicheHits * 4)

  const ipHits = keywordHits(text, IP_RISK_TERMS)
  const safetyHits = keywordHits(text, SAFETY_RISK_TERMS)
  const ipRisk = clamp(signal.hints?.ipRisk ?? ipHits * 35)
  const safetyRisk = clamp(signal.hints?.safetyRisk ?? safetyHits * 40)

  const designability = clamp(
    signal.hints?.designability ??
      Math.max(25, flashDesignFit * 0.75 + (100 - ipRisk) * 0.2 - (text.length > 90 ? 10 : 0))
  )

  const estimatedMargin = clamp(
    signal.hints?.estimatedMargin ??
      Math.max(22, commercialIntent * 0.5 + (100 - competition) * 0.2 + flashDesignFit * 0.15)
  )

  return {
    virality,
    growth,
    commercialIntent,
    audienceFit,
    seasonality,
    evergreenPotential,
    competition,
    ipRisk,
    safetyRisk,
    designability,
    estimatedMargin,
    flashDesignFit,
    holidayBoost: holiday.score,
    algorithmVersion: VIRAL_ALGORITHM_VERSION,
  }
}
