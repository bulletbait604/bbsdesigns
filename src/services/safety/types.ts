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
  niche?: 'gaming' | 'baseball' | 'softball'
  imageSummary?: string
  /** Skip AI stage when false (unit tests / offline). Default true. */
  runAiReview?: boolean
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
