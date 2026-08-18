import { getEnv } from '@/lib/env'
import { isMongoConfigured } from '@/lib/db'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'

export type AutonomyReadiness = {
  /** Trends → slogans → AI illustrations → listings enqueue can run unattended. */
  readyForAutonomousGeneration: boolean
  /** Live Shopify drafts without a human click — intentionally false with default gates. */
  readyForAutonomousPublish: boolean
  textDesigns: { ready: boolean; provider: string; detail: string }
  imageDesigns: { ready: boolean; provider: string; detail: string; maxAiPerRun: number }
  mongo: boolean
  cronConfiguredHint: string
  blockers: string[]
  notes: string[]
}

function hasGeminiFamilyKey(): boolean {
  const env = getEnv()
  return Boolean(
    (env.AI_TEXT_API_KEY || '').trim() ||
      (env.IMAGE_API_KEY || '').trim() ||
      (process.env.GOOGLE_API_KEY || '').trim() ||
      (process.env.GEMINI_API_KEY || '').trim() ||
      (process.env.GEMINI_API || '').trim()
  )
}

function maxAiDesignsPerRun(): number {
  const raw = Number(process.env.MAX_AI_DESIGNS_PER_RUN || 5)
  if (!Number.isFinite(raw) || raw <= 0) return 5
  return Math.min(20, Math.floor(raw))
}

/**
 * Triple-check whether the AI pipeline can run on its own (generation path).
 * Publishing stays human-gated by default (HUMAN_APPROVAL=true, AUTO_PUBLISH=false).
 */
export function assessAutonomyReadiness(): AutonomyReadiness {
  bootstrapProviders()
  const env = getEnv()
  const blockers: string[] = []
  const notes: string[] = []

  const mongo = isMongoConfigured()
  if (!mongo) blockers.push('MONGODB_URI required for durable pipeline state')

  const text = tryGetProvider('ai_text')
  const textOk =
    Boolean(text) && text!.validateConfig().ok && !text!.name.toLowerCase().includes('stub')
  const textDesigns = {
    ready: textOk,
    provider: text?.name || 'none',
    detail: textOk
      ? 'AI slogan/text ideas via Gemini'
      : 'Set GEMINI_API / AI_TEXT_API_KEY — otherwise template slogans only',
  }
  if (!textOk) blockers.push('AI text provider not configured (slogans fall back to templates)')

  const image = tryGetProvider('image')
  const imageOk =
    Boolean(image) && image!.validateConfig().ok && !image!.name.toLowerCase().includes('stub')
  const maxAi = maxAiDesignsPerRun()
  const imageDesigns = {
    ready: imageOk,
    provider: image?.name || 'none',
    detail: imageOk
      ? `Google illustrated designs (up to ${maxAi} per daily design_generation run)`
      : 'Set IMAGE_PROVIDER=google + GEMINI_API / IMAGE_API_KEY — otherwise SVG placeholders only',
    maxAiPerRun: maxAi,
  }
  if (!imageOk) blockers.push('Image provider not configured (designs stay SVG placeholders)')

  if (!process.env.CRON_SECRET) {
    notes.push('Set CRON_SECRET so Vercel Cron /api/cron/automation is authenticated')
  }
  notes.push(
    'Vercel Cron hits GET /api/cron/automation daily (see vercel.json). Publishing stays human-approved.'
  )
  if (env.HUMAN_APPROVAL && !env.AUTO_PUBLISH) {
    notes.push(
      'HUMAN_APPROVAL=true and AUTO_PUBLISH=false — AI fills the queue; Admin creates Shopify drafts from Publishing.'
    )
  }
  if (!hasGeminiFamilyKey()) {
    notes.push('No Gemini/Google API key detected in env')
  }

  const readyForAutonomousGeneration = mongo && textOk && imageOk
  const readyForAutonomousPublish = false // product policy: never claim auto-publish while gated

  return {
    readyForAutonomousGeneration,
    readyForAutonomousPublish,
    textDesigns,
    imageDesigns,
    mongo,
    cronConfiguredHint: 'vercel.json crons → /api/cron/automation (0 14 * * *)',
    blockers,
    notes,
  }
}
