import type { Niche } from '@/types'
import type { NormalizedTrendSignal, TrendMetricComponents } from '@/services/trends/types'

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

const NICHE_KEYWORDS: Record<Niche, string[]> = {
  gaming: ['game', 'gamer', 'console', 'pc', 'lag', 'raid', 'pixel', 'controller', 'stream'],
  baseball: ['baseball', 'bat', 'pitch', 'diamond', 'inning', 'homer', 'catcher', 'mlb'],
  softball: ['softball', 'cleat', 'dugout', 'beer league', 'fastpitch', 'slowpitch', 'plate'],
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

function seasonalityForNiche(niche: Niche, observedAt: Date): number {
  const month = observedAt.getUTCMonth() + 1
  if (niche === 'baseball' || niche === 'softball') {
    if (month >= 3 && month <= 9) return 88
    if (month === 2 || month === 10) return 70
    return 45
  }
  // gaming is relatively year-round with holiday bump
  if (month === 11 || month === 12) return 90
  return 75
}

/**
 * Estimate metric components from signal text + optional adapter hints.
 * Heuristic only — never a sales guarantee.
 */
export function estimateMetrics(signal: NormalizedTrendSignal): TrendMetricComponents & {
  ipRisk: number
  safetyRisk: number
  designability: number
  estimatedMargin: number
} {
  const text = `${signal.title} ${signal.summary} ${signal.keywords.join(' ')}`
  const nicheHits = keywordHits(text, NICHE_KEYWORDS[signal.niche])
  const audienceFit = clamp(
    signal.hints?.audienceFit ?? 55 + nicheHits * 12
  )

  const virality = clamp(signal.hints?.virality ?? 40 + Math.min(30, signal.keywords.length * 4))
  const growth = clamp(signal.hints?.growth ?? Math.max(35, virality - 8))
  const commercialIntent = clamp(
    signal.hints?.commercialIntent ??
      45 + (text.includes('shirt') || text.includes('merch') ? 20 : 10)
  )
  const seasonality = clamp(
    signal.hints?.seasonality ?? seasonalityForNiche(signal.niche, signal.observedAt)
  )
  const evergreenPotential = clamp(
    signal.hints?.evergreenPotential ?? (seasonality < 60 ? 80 : 55 + (100 - seasonality) * 0.2)
  )
  const competition = clamp(signal.hints?.competition ?? 40 + nicheHits * 5)

  const ipHits = keywordHits(text, IP_RISK_TERMS)
  const safetyHits = keywordHits(text, SAFETY_RISK_TERMS)
  const ipRisk = clamp(signal.hints?.ipRisk ?? ipHits * 35)
  const safetyRisk = clamp(signal.hints?.safetyRisk ?? safetyHits * 40)

  const designability = clamp(
    signal.hints?.designability ?? Math.max(20, 90 - ipRisk * 0.5 - (text.length > 80 ? 15 : 0))
  )
  const estimatedMargin = clamp(
    signal.hints?.estimatedMargin ?? Math.max(20, commercialIntent * 0.55 + (100 - competition) * 0.25)
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
  }
}
