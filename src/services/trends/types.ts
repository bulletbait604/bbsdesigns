import type { Niche } from '@/types'

/** Normalized in-memory trend signal used across adapters and scoring. */
export type NormalizedTrendSignal = {
  niche: Niche
  source: string
  externalId: string
  title: string
  summary: string
  keywords: string[]
  observedAt: Date
  sourceRefs: string[]
  raw: Record<string, unknown>
  /** Optional hints from source adapters (0-100). */
  hints?: Partial<{
    virality: number
    growth: number
    commercialIntent: number
    audienceFit: number
    seasonality: number
    evergreenPotential: number
    competition: number
    ipRisk: number
    safetyRisk: number
    designability: number
    estimatedMargin: number
  }>
}

export type TrendMetricComponents = {
  virality: number
  growth: number
  commercialIntent: number
  audienceFit: number
  seasonality: number
  evergreenPotential: number
  competition: number
}

export type TrendScoreWeights = {
  virality: number
  growth: number
  commercialIntent: number
  audienceFit: number
  seasonality: number
  evergreenPotential: number
  competition: number
}

export type ScoredTrend = {
  signal: NormalizedTrendSignal
  score: number
  components: TrendMetricComponents
  weights: TrendScoreWeights
  ipRisk: number
  safetyRisk: number
  designability: number
  estimatedMargin: number
  commercialPotential: number
  originalityPotential: number
  riskFlags: string[]
  explanation: string
  /** Always false — high score must not bypass safety. */
  safetyBypassAllowed: false
  disclaimer: string
}
