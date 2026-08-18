import type { Niche } from '@/lib/niches'
import type { DesignStyleId } from '@/services/researchV2/styleLibrary'
import type { ConceptCombination } from '@/services/researchV2/types'

export const DESIGN_ENGINE_V2_VERSION = 'design-engine-v2-2026-08'
export const DESIGN_PROMPT_V2_VERSION = 'design-prompt-v10-creative-director'

export type TypographyTreatment =
  | 'arched_headline'
  | 'stacked_kinetic'
  | 'curved_banner'
  | 'oversized_outline'
  | 'prop_locked'
  | 'letter_as_icon'
  | 'circular_badge'
  | 'split_dimensional'

export type CreativeBrief = {
  product: string
  targetAudience: string
  trend: string
  conceptHeadline: string
  styleId: DesignStyleId | string
  styleLabel: string
  primaryText: string
  secondaryText: string
  visualStory: string
  character: string
  pose: string
  expression: string
  colors: string[]
  composition: string
  typographyTreatment: TypographyTreatment
  visualDominancePct: number
  typographyDominancePct: number
  printNotes: string
  niche: Niche
  conceptId: string
}

export type DesignReviewScores = {
  visualImpact: number
  professionalism: number
  originality: number
  printability: number
  typography: number
  composition: number
  trendFit: number
  audienceFit: number
  commercialAppeal: number
  viralPotential: number
  ipRisk: number
  overallScore: number
}

export type DesignReviewV2Result = {
  scores: DesignReviewScores
  decision: 'PASS' | 'REVIEW' | 'REJECT'
  reasons: string[]
  gates: {
    overallMin: number
    visualImpactMin: number
    commercialAppealMin: number
    typographyMin: number
  }
  reviewedAt: string
}

export type DesignDirectionCandidate = {
  brief: CreativeBrief
  prompt: string
  negativePrompt: string
  promptVersion: string
  preImageReview: DesignReviewV2Result
  concept: ConceptCombination
}

export type DesignEngineV2Result = {
  opportunityId?: string
  directions: DesignDirectionCandidate[]
  accepted: DesignDirectionCandidate[]
  rejected: DesignDirectionCandidate[]
  selected: DesignDirectionCandidate[]
  engineVersion: string
}
