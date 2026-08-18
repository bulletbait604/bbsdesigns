export type AutomationJobName =
  | 'trend_ingestion'
  | 'trend_scoring'
  | 'idea_generation'
  | 'safety_review'
  | 'design_generation'
  | 'image_review'
  | 'mockups'
  | 'listing_preparation'
  | 'publishing'
  | 'analytics_sync'
  | 'retirement_candidates'
  | 'weekly_report'

export type AutomationRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'paused'

export type AutomationTrigger = 'schedule' | 'manual' | 'retry'

export type AutomationJobDefinition = {
  name: AutomationJobName
  label: string
  description: string
  /** When true, job respects HUMAN_APPROVAL and will not auto-publish */
  requiresHumanApprovalGate: boolean
}

export type AutomationRunRecord = {
  id: string
  jobName: AutomationJobName
  idempotencyKey: string
  status: AutomationRunStatus
  trigger: AutomationTrigger
  attempt: number
  maxAttempts: number
  summary: string
  logs: string[]
  error?: string | null
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
  stats?: Record<string, unknown>
}

export type AutomationJobState = {
  name: AutomationJobName
  paused: boolean
  lastRunId?: string
  lastStatus?: AutomationRunStatus
  lastFinishedAt?: string
}
