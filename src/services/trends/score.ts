import { estimateMetrics } from '@/services/trends/metrics'
import type {
  NormalizedTrendSignal,
  ScoredTrend,
  TrendScoreWeights,
} from '@/services/trends/types'

/** Default weights from docs/05-TREND-SCORING.md and prompt 006. */
export const DEFAULT_TREND_WEIGHTS: TrendScoreWeights = {
  virality: 0.25,
  growth: 0.2,
  commercialIntent: 0.15,
  audienceFit: 0.15,
  seasonality: 0.1,
  evergreenPotential: 0.1,
  competition: 0.05,
}

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
 * Weighted commercial opportunity score.
 * IP/safety risks are reported separately and never allow publish bypass.
 */
export function scoreTrend(
  signal: NormalizedTrendSignal,
  weightOverrides?: Partial<TrendScoreWeights>
): ScoredTrend {
  const weights = normalizeWeights(weightOverrides)
  const metrics = estimateMetrics(signal)

  // Competition is a penalty component: higher competition lowers contribution.
  const competitionContribution = 100 - metrics.competition

  const weighted =
    metrics.virality * weights.virality +
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

  const explanation = [
    `Score ${score}/100 for "${signal.title}" (${signal.niche}).`,
    `Virality ${metrics.virality} (w=${round1(weights.virality)}), growth ${metrics.growth} (w=${round1(weights.growth)}),`,
    `commercial ${metrics.commercialIntent} (w=${round1(weights.commercialIntent)}), audience fit ${metrics.audienceFit} (w=${round1(weights.audienceFit)}),`,
    `seasonality ${metrics.seasonality} (w=${round1(weights.seasonality)}), evergreen ${metrics.evergreenPotential} (w=${round1(weights.evergreenPotential)}),`,
    `competition penalty from ${metrics.competition} (w=${round1(weights.competition)}).`,
    `IP risk ${metrics.ipRisk}, safety risk ${metrics.safetyRisk}, designability ${metrics.designability}.`,
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
    originalityPotential: Math.max(0, Math.min(100, Math.round(100 - metrics.competition * 0.6))),
    riskFlags,
    explanation,
    safetyBypassAllowed: false,
    disclaimer: 'Trend scores estimate opportunity only and never guarantee sales or legal clearance.',
  }
}
