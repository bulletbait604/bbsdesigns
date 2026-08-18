import type { Niche } from '@/lib/niches'

export const SAFETY_POLICY_VERSION = 'safety-policy-v1'

export type SafetyDecision = 'PASS' | 'REVIEW' | 'REJECT'

export type SafetyStageName =
  | 'normalize'
  | 'blocked_terms'
  | 'ip_risk'
  | 'ai_text_review'
  | 'image_review'
  | 'final'

export type SafetyStageResult = {
  stage: SafetyStageName
  triggered: string[]
  notes: string[]
  riskDelta: number
}

export type SafetyReviewInput = {
  text: string
  niche?: Niche
  imageSummary?: string
  imageBytesLength?: number
  imageMimeType?: string
  /** Skip AI stage when false (unit tests / offline). Default true. */
  runAiReview?: boolean
  /** Persist/log decision (default true). */
  persistLog?: boolean
  targetType?: 'idea' | 'design' | 'product' | 'slogan' | 'text'
  targetId?: string
  storeId?: string
  brandId?: string
}

export type SafetyReviewResult = {
  decision: SafetyDecision
  score: number
  ipRisk: number
  safetyRisk: number
  reasons: string[]
  ipRiskFlags: string[]
  tosRiskFlags: string[]
  stages: SafetyStageResult[]
  policyVersion: string
  normalizedText: string
  provider: string
  model: string
  modelResponse: string
  reviewedAt: string
  disclaimer: string
}
