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
