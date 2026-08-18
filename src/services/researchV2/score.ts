import type { Niche } from '@/lib/niches'
import { getActiveHolidayWindows, holidayBoostForText } from '@/services/trends/viralAlgorithm'
import type { ResearchRecord, ScoreBreakdown } from '@/services/researchV2/types'

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)))

const PURCHASE_INTENT_PHRASES = [
  'need this',
  'where can i buy',
  'i need this shirt',
  'take my money',
  'this is literally me',
  'need one',
  'my husband needs',
  'my girlfriend needs',
  'perfect gift',
  'where did you get',
  'gift for',
  'buying this',
]

const GIFT_KEYWORDS = [
  'birthday',
  'christmas',
  "father's day",
  "mother's day",
  'valentine',
  'graduation',
  'wedding',
  'bachelor',
  'bachelorette',
  'tournament',
  'team gift',
  'coworker gift',
  'couple gift',
  'gamer gift',
]

export function detectPurchaseIntentLanguage(text: string): { hits: string[]; score: number } {
  const lower = text.toLowerCase()
  const hits = PURCHASE_INTENT_PHRASES.filter((p) => lower.includes(p))
  return { hits, score: clamp(hits.length * 18 + (hits.length ? 20 : 0)) }
}

export function giftIntentScore(text: string, niche: Niche, now = new Date()): number {
  const lower = text.toLowerCase()
  let score = 15
  for (const k of GIFT_KEYWORDS) {
    if (lower.includes(k)) score += 12
  }
  const holiday = holidayBoostForText(text, niche, now)
  score += holiday.score * 0.35
  if (/\bgift\b/.test(lower)) score += 15
  return clamp(score)
}

export function seasonalOpportunityScore(text: string, niche: Niche, now = new Date()): number {
  const active = getActiveHolidayWindows(now)
  const holiday = holidayBoostForText(text, niche, now)
  // Forecast: windows already include lead time via startMd
  const base = holiday.score
  const upcomingBonus = active.length ? 10 : 0
  return clamp(base * 0.9 + upcomingBonus)
}

export function crossPlatformMomentumScore(sources: string[]): number {
  const unique = [...new Set(sources.map((s) => s.toLowerCase().split(/[-_]/)[0]))]
  const n = unique.length
  if (n <= 1) return 25
  if (n === 2) return 50
  if (n === 3) return 75
  return 95
}

/**
 * OpportunityScore weights (Part 8):
 * TrendVelocity 20%, CrossPlatform 15%, Commerce 20%, Audience 10%,
 * Design 15%, Originality 10%, Seasonality 5%, Competition 5%
 * then subtract risk penalties.
 */
export function scoreResearchOpportunity(input: {
  niche: Niche
  topic: string
  records: ResearchRecord[]
  sources: string[]
}): ScoreBreakdown {
  const textBlob = [
    input.topic,
    ...input.records.flatMap((r) => [
      r.topic,
      r.audience,
      ...r.visualPatterns,
      ...r.recurringPhrases,
      ...r.riskSignals,
    ]),
  ].join(' ')

  const avg = (pick: (r: ResearchRecord) => number) => {
    if (!input.records.length) return 40
    return input.records.reduce((s, r) => s + pick(r), 0) / input.records.length
  }

  const trendScore = clamp(avg((r) => r.searchInterest * 0.5 + r.trendVelocity * 0.5))
  const velocityScore = clamp(avg((r) => r.trendVelocity))
  const persistenceScore = clamp(
    avg((r) => Math.min(100, r.searchInterest * 0.6 + (100 - Math.min(r.trendVelocity, 100)) * 0.25 + 20))
  )
  const socialScore = clamp(avg((r) => r.engagementSignals))
  const searchScore = clamp(avg((r) => r.searchInterest))
  const commerceScore = clamp(avg((r) => r.commercialSignals * 0.55 + r.buyerIntent * 0.45))
  const engagementScore = clamp(avg((r) => r.engagementSignals))
  const audienceScore = clamp(55 + (input.records[0]?.demographicSignals.length || 0) * 8)
  const designScore = clamp(
    40 +
      avg((r) => r.designPatterns.length * 8 + r.visualPatterns.length * 6) +
      (/\b(illustration|mascot|graphic|character)\b/i.test(textBlob) ? 15 : 0)
  )
  const competitionRaw = clamp(avg((r) => r.competition))
  const competitionScore = clamp(100 - competitionRaw) // higher = better opportunity (less saturated)
  const originalityOpportunity = clamp(100 - competitionRaw * 0.55 + (designScore > 70 ? 10 : 0))
  const seasonalScore = seasonalOpportunityScore(textBlob, input.niche)
  const giftIntent = giftIntentScore(textBlob, input.niche)
  const crossPlatform = crossPlatformMomentumScore(input.sources)
  const intentLang = detectPurchaseIntentLanguage(textBlob)
  const viralMomentum = clamp(
    velocityScore * 0.35 +
      socialScore * 0.25 +
      crossPlatform * 0.2 +
      intentLang.score * 0.2
  )

  const riskBlob = input.records.flatMap((r) => r.riskSignals).join(' ').toLowerCase()
  let ipRisk = clamp(avg((r) => (r.riskSignals.length ? 20 + r.riskSignals.length * 10 : 8)))
  if (/\b(nfl|nba|mlb|disney|marvel|pokemon|nintendo|official|licensed)\b/.test(riskBlob + textBlob.toLowerCase())) {
    ipRisk = clamp(ipRisk + 35)
  }

  let riskPenalties = 0
  if (ipRisk >= 50) riskPenalties += 25
  else if (ipRisk >= 30) riskPenalties += 12
  if (competitionRaw >= 85) riskPenalties += 10
  if (commerceScore < 35 && viralMomentum > 70) riskPenalties += 8 // viral ≠ profitable

  const opportunityScore = clamp(
    velocityScore * 0.2 +
      crossPlatform * 0.15 +
      commerceScore * 0.2 +
      audienceScore * 0.1 +
      designScore * 0.15 +
      originalityOpportunity * 0.1 +
      seasonalScore * 0.05 +
      competitionScore * 0.05 -
      riskPenalties +
      giftIntent * 0.03
  )

  const explanation = [
    `Opportunity ${opportunityScore}/100 for "${input.topic}" (${input.niche}).`,
    `Velocity ${velocityScore}, cross-platform ${crossPlatform} (${input.sources.length} sources),`,
    `commerce ${commerceScore}, design ${designScore}, originality ${originalityOpportunity},`,
    `seasonal ${seasonalScore}, gift ${giftIntent}, viral momentum ${viralMomentum}.`,
    `Competition openness ${competitionScore}, IP risk ${ipRisk}, penalties -${riskPenalties}.`,
    intentLang.hits.length ? `Purchase-intent language: ${intentLang.hits.join(', ')}.` : '',
    'High search volume alone is not enough — commerce + design + originality matter.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    trendScore,
    velocityScore,
    persistenceScore,
    socialScore,
    searchScore,
    commerceScore,
    engagementScore,
    audienceScore,
    designScore,
    competitionScore,
    originalityOpportunity,
    seasonalScore,
    giftIntentScore: giftIntent,
    viralMomentumScore: viralMomentum,
    crossPlatformMomentumScore: crossPlatform,
    ipRisk,
    opportunityScore,
    riskPenalties,
    explanation,
  }
}
