/** Shared domain types — expanded in later prompts. */

export type SafetyDecision = 'PASS' | 'REVIEW' | 'REJECT'

export type Niche = 'gaming' | 'baseball' | 'softball'

export type PublishStatus =
  | 'draft_idea'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'shopify_draft'
  | 'published'
  | 'retired'

/** Required lineage for every generated product/asset. */
export type ProvenanceFields = {
  sourceTrendIds: string[]
  ideaId?: string | null
  sloganId?: string | null
  promptVersion: string
  modelProvider: string
  modelName?: string
  imageAssetKey?: string | null
  safetyReviewId?: string | null
  qualityScore?: number | null
  safetyScore?: number | null
  safetyDecision?: SafetyDecision | null
  publishStatus: PublishStatus
}
