import { estimateMetrics } from '@/services/trends/metrics'
import { VIRAL_TREND_WEIGHTS, VIRAL_ALGORITHM_VERSION } from '@/services/trends/viralAlgorithm'
import type {
  NormalizedTrendSignal,
  ScoredTrend,
  TrendScoreWeights,
} from '@/services/trends/types'

/** Viral Flash defaults — replaces legacy docs/05 weights. */
export const DEFAULT_TREND_WEIGHTS: TrendScoreWeights = { ...VIRAL_TREND_WEIGHTS }

export function normalizeWeights(input?: Partial<TrendScoreWeights>): TrendScoreWeights {
  const merged: TrendScoreWeights = { ...DEFAULT_TREND_WEIGHTS, ...input }
  const sum =
    merged.virality +
    merged.growth +
    merged.commercialIntent +
    merged.audienceFit +
    merged.seasonality +
    merged.evergreenPotential +
    merged.competition

  if (sum <= 0) return { ...DEFAULT_TREND_WEIGHTS }

  return {
    virality: merged.virality / sum,
    growth: merged.growth / sum,
    commercialIntent: merged.commercialIntent / sum,
    audienceFit: merged.audienceFit / sum,
    seasonality: merged.seasonality / sum,
    evergreenPotential: merged.evergreenPotential / sum,
    competition: merged.competition / sum,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Viral Flash commercial opportunity score.
 * IP/safety risks are reported separately and never allow publish bypass.
 */
export function scoreTrend(
  signal: NormalizedTrendSignal,
  weightOverrides?: Partial<TrendScoreWeights>
): ScoredTrend {
  const weights = normalizeWeights(weightOverrides)
  const metrics = estimateMetrics(signal)

  const competitionContribution = 100 - metrics.competition

  // Blend flash-design fit into virality contribution without breaking schema
  const viralityEff = Math.min(100, metrics.virality * 0.7 + metrics.flashDesignFit * 0.3)

  const weighted =
    viralityEff * weights.virality +
    metrics.growth * weights.growth +
    metrics.commercialIntent * weights.commercialIntent +
    metrics.audienceFit * weights.audienceFit +
    metrics.seasonality * weights.seasonality +
    metrics.evergreenPotential * weights.evergreenPotential +
    competitionContribution * weights.competition

  const score = Math.max(0, Math.min(100, Math.round(weighted)))

  const riskFlags: string[] = []
  if (metrics.ipRisk >= 40) riskFlags.push('elevated_ip_risk')
  if (metrics.safetyRisk >= 40) riskFlags.push('elevated_safety_risk')
  if (metrics.competition >= 75) riskFlags.push('high_competition')
  if (metrics.designability < 40) riskFlags.push('low_designability')
  if (metrics.flashDesignFit < 45) riskFlags.push('low_flash_design_fit')

  const explanation = [
    `Viral Flash score ${score}/100 for "${signal.title}" (${signal.niche}) [${VIRAL_ALGORITHM_VERSION}].`,
    `Virality ${metrics.virality} (flashFit ${metrics.flashDesignFit}), growth ${metrics.growth},`,
    `commercial ${metrics.commercialIntent}, audience ${metrics.audienceFit},`,
    `seasonality/holiday ${metrics.seasonality} (boost ${metrics.holidayBoost}), evergreen ${metrics.evergreenPotential},`,
    `competition ${metrics.competition}.`,
    `IP ${metrics.ipRisk}, safety ${metrics.safetyRisk}, designability ${metrics.designability}.`,
    `Weights v=${round1(weights.virality)} g=${round1(weights.growth)} c=${round1(weights.commercialIntent)} s=${round1(weights.seasonality)}.`,
    riskFlags.length ? `Flags: ${riskFlags.join(', ')}.` : 'No elevated risk flags.',
    'A high score does not bypass safety review or guarantee sales.',
  ].join(' ')

  return {
    signal,
    score,
    components: {
      virality: metrics.virality,
      growth: metrics.growth,
      commercialIntent: metrics.commercialIntent,
      audienceFit: metrics.audienceFit,
      seasonality: metrics.seasonality,
      evergreenPotential: metrics.evergreenPotential,
      competition: metrics.competition,
    },
    weights,
    ipRisk: metrics.ipRisk,
    safetyRisk: metrics.safetyRisk,
    designability: metrics.designability,
    estimatedMargin: metrics.estimatedMargin,
    commercialPotential: metrics.commercialIntent,
    originalityPotential: Math.max(0, Math.min(100, Math.round(100 - metrics.competition * 0.55))),
    riskFlags,
    explanation,
    safetyBypassAllowed: false,
    disclaimer:
      'Viral Flash trend scores estimate opportunity only and never guarantee sales or legal clearance.',
  }
}
