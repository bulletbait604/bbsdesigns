import type { AutomationJobDefinition, AutomationJobName } from '@/services/automation/types'

export const AUTOMATION_JOBS: AutomationJobDefinition[] = [
  {
    name: 'trend_ingestion',
    label: 'Trend research',
    description: 'Fetch, score, and save niche demand themes (SerpAPI/Etsy when keyed)',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'trend_scoring',
    label: 'Trend scoring (alias)',
    description: 'Same pipeline as trend research — kept for schedule compatibility; skips if research already ran today',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'idea_generation',
    label: 'Idea generation',
    description: 'Write viral slogan + visual concept candidates from top trends',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'safety_review',
    label: 'Safety review',
    description: 'PASS / REVIEW / REJECT gate',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'design_generation',
    label: 'Design generation',
    description: 'One viral AI design per idea: imagery + slogan text integrated together',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'image_review',
    label: 'Image review',
    description: 'Quality and safety check on artwork',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'mockups',
    label: 'Mockups',
    description: 'Build apparel mockups',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'listing_preparation',
    label: 'Listing preparation',
    description: 'Title, description, tags, variants',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'publishing',
    label: 'Publishing',
    description: 'Gate check only while HUMAN_APPROVAL — create drafts from Publishing UI',
    requiresHumanApprovalGate: true,
  },
  {
    name: 'analytics_sync',
    label: 'Analytics sync',
    description: 'Ingest stored sales / traffic metrics',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'retirement_candidates',
    label: 'Retirement candidates',
    description: 'Flag RETIRE_CANDIDATE — never auto-delete',
    requiresHumanApprovalGate: false,
  },
  {
    name: 'weekly_report',
    label: 'Weekly report',
    description: 'Generate weekly analytics narrative from stored metrics',
    requiresHumanApprovalGate: false,
  },
]

export function getJobDefinition(name: AutomationJobName): AutomationJobDefinition {
  const job = AUTOMATION_JOBS.find((j) => j.name === name)
  if (!job) throw new Error(`Unknown automation job: ${name}`)
  return job
}
