/**
 * Automation operating modes (Part 34).
 * Default remains REVIEW MODE — human approval required, no auto-publish.
 */
export type AutomationMode = 'safe' | 'creative' | 'review' | 'production' | 'auto'

export type AutomationModeConfig = {
  mode: AutomationMode
  research: boolean
  generateIdeas: boolean
  generateDesigns: boolean
  safety: boolean
  enqueueApproval: boolean
  publish: boolean
  description: string
}

const MODES: Record<AutomationMode, Omit<AutomationModeConfig, 'mode'>> = {
  safe: {
    research: true,
    generateIdeas: false,
    generateDesigns: false,
    safety: false,
    enqueueApproval: false,
    publish: false,
    description: 'Research only',
  },
  creative: {
    research: true,
    generateIdeas: true,
    generateDesigns: false,
    safety: false,
    enqueueApproval: false,
    publish: false,
    description: 'Research + generate ideas',
  },
  review: {
    research: true,
    generateIdeas: true,
    generateDesigns: true,
    safety: true,
    enqueueApproval: true,
    publish: false,
    description: 'Research + ideas + designs + safety + approval queue',
  },
  production: {
    research: true,
    generateIdeas: true,
    generateDesigns: true,
    safety: true,
    enqueueApproval: true,
    publish: false, // still gated unless AUTO mode + flags allow
    description: 'Research + generate + safety + approved publishing rules (still human-gated by default)',
  },
  auto: {
    research: true,
    generateIdeas: true,
    generateDesigns: true,
    safety: true,
    enqueueApproval: true,
    publish: true,
    description: 'Full auto — ONLY after explicit configuration',
  },
}

export function resolveAutomationMode(raw?: string): AutomationModeConfig {
  const key = (raw || process.env.AUTOMATION_MODE || 'review').trim().toLowerCase() as AutomationMode
  const mode: AutomationMode = MODES[key] ? key : 'review'
  // Hard safety: never silently enable auto
  if (mode === 'auto' && process.env.ALLOW_AUTO_MODE !== 'true') {
    return { mode: 'review', ...MODES.review }
  }
  return { mode, ...MODES[mode] }
}
