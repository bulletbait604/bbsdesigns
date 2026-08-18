import type { Niche } from '@/lib/niches'
import type { DesignStyleId } from '@/services/researchV2/styleLibrary'

/** Product research observation — descriptive only, never stores copyrighted art. */
export type ResearchRecord = {
  topic: string
  niche: Niche
  source: string
  sourceUrl?: string
  detectedAt: string
  trendVelocity: number
  searchInterest: number
  engagementSignals: number
  commercialSignals: number
  buyerIntent: number
  seasonality: number
  competition: number
  visualPatterns: string[]
  recurringPhrases: string[]
  productTypes: string[]
  priceRange?: { min?: number; max?: number; currency?: string }
  audience: string
  demographicSignals: string[]
  designPatterns: string[]
  riskSignals: string[]
}

export type ScoreBreakdown = {
  trendScore: number
  velocityScore: number
  persistenceScore: number
  socialScore: number
  searchScore: number
  commerceScore: number
  engagementScore: number
  audienceScore: number
  designScore: number
  competitionScore: number
  originalityOpportunity: number
  seasonalScore: number
  giftIntentScore: number
  viralMomentumScore: number
  crossPlatformMomentumScore: number
  ipRisk: number
  opportunityScore: number
  riskPenalties: number
  explanation: string
}

export type TrendCluster = {
  id: string
  parentTrend: string
  niche: Niche
  subTrends: string[]
  audiences: string[]
  products: string[]
  designDirections: string[]
}

export type ConceptCombination = {
  id: string
  trend: string
  audience: string
  humor: string
  product: string
  visualStyle: DesignStyleId | string
  niche: Niche
  headline: string
  primaryText: string
  secondaryText: string
  visualStory: string
  recommendedStyleId: DesignStyleId | string
  recommendedStyleScore: number
  conceptScore: number
}

export type ResearchOpportunity = {
  id: string
  topic: string
  niche: Niche
  clusterId?: string
  records: ResearchRecord[]
  sources: string[]
  scores: ScoreBreakdown
  clusters?: TrendCluster
  topConcepts: ConceptCombination[]
  productTypesRecommended: string[]
  engineVersion: string
  createdAt: string
}

export const RESEARCH_ENGINE_V2_VERSION = 'research-engine-v2-2026-08'
