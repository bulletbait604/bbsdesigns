import type { Niche, SafetyDecision } from '@/types'
import { DESIGN_PROMPT_V2_VERSION } from '@/services/designV2/types'

/** Bump invalidates design caches + marks old gallery art as stale/placeholder. */
export const DESIGN_PROMPT_VERSION = DESIGN_PROMPT_V2_VERSION

export type DesignPromptInput = {
  niche: Niche
  slogan: string
  concept?: string
  ideaId?: string
}

export type BuiltDesignPrompt = {
  prompt: string
  negativePrompt: string
  promptVersion: string
  width: number
  height: number
}

export type GeneratedDesignRecord = {
  provider: string
  model: string
  prompt: string
  negativePrompt: string
  promptVersion: string
  sourceIdeaId?: string
  slogan: string
  niche: Niche
  assetKey: string
  assetUrl: string
  mimeType: string
  width: number
  height: number
  status: 'generated' | 'review' | 'approved' | 'rejected'
  createdAt: string
}

export type ImageReviewResult = {
  qualityScore: number
  ipRisk: number
  safetyScore: number
  issues: string[]
  decision: SafetyDecision
  threshold: number
  reviewedAt: string
  disclaimer: string
}

export type DesignPipelineResult = {
  design: GeneratedDesignRecord
  review: ImageReviewResult
  publishAllowed: false
  /** Raw image bytes for dashboard preview / asset store */
  bytes: Buffer
}
