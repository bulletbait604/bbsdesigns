import type { SafetyDecision } from '@/types'
import { normalizeSafetyText } from '@/services/safety/normalize'
import { runIpRiskStage } from '@/services/safety/ipRisk'
import { runBlockedTermStage } from '@/services/safety/blockedTerms'
import type { ImageReviewResult } from '@/services/designs/types'

/**
 * Stage 5 / prompt 010 — image quality + IP review.
 * Uses prompt/slogan signals until a vision model adapter is wired.
 * Uncertain designs become REVIEW; never auto-publish.
 */
export function reviewGeneratedImage(input: {
  slogan: string
  prompt: string
  niche: string
  bytesLength: number
  mimeType: string
  minQuality?: number
  /** True when slogan typography was composited onto AI art (starter: art + clean type). */
  hasCompositedTypography?: boolean
}): ImageReviewResult {
  const threshold = input.minQuality ?? 85
  const issues: string[] = []
  let qualityScore = 90
  let ipRisk = 5
  let safetyScore = 92

  // Scan slogan only for IP/blocked terms. The full prompt names banned
  // franchises/leagues in safety instructions and must not self-trigger REJECT.
  const sloganNorm = normalizeSafetyText(input.slogan)
  const ip = runIpRiskStage(sloganNorm)
  const blocked = runBlockedTermStage(sloganNorm)

  if (ip.triggered.length) {
    ipRisk = Math.min(100, 40 + ip.triggered.length * 20)
    issues.push(...ip.triggered.map((t) => `ip_similarity:${t}`))
  }
  if (blocked.triggered.length) {
    safetyScore = Math.max(0, safetyScore - blocked.riskDelta)
    issues.push(...blocked.triggered.map((t) => `safety:${t}`))
  }

  if (!input.mimeType.startsWith('image/')) {
    qualityScore -= 40
    issues.push('invalid_mime_type')
  }
  if (input.bytesLength < 32) {
    qualityScore -= 50
    issues.push('asset_too_small')
  }
  if (input.slogan.length > 48) {
    qualityScore -= 10
    issues.push('typography_too_dense')
  }
  if (/\b(official|licensed|authentic)\b/i.test(input.slogan)) {
    ipRisk += 15
    issues.push('official_licensed_language')
  }
  // Spelling / printability heuristics on slogan tokens
  if (/\s{2,}/.test(input.slogan) || /[^\w\s.'.!?-]/.test(input.slogan)) {
    qualityScore -= 8
    issues.push('typography_noise')
  }
  if (!input.prompt.toLowerCase().includes('no logos')) {
    issues.push('prompt_missing_logo_ban')
    qualityScore -= 5
  }

  // Starter 009/010: designs must be graphics with typography, not text-only
  const promptLower = input.prompt.toLowerCase()
  const asksGraphic =
    promptLower.includes('illustration') ||
    promptLower.includes('graphic') ||
    promptLower.includes('subject')
  if (!asksGraphic) {
    issues.push('prompt_missing_graphic_requirement')
    qualityScore -= 15
  }
  if (input.hasCompositedTypography) {
    qualityScore = Math.min(100, qualityScore + 3)
  } else if (!promptLower.includes('typography') && !promptLower.includes('lettering') && !promptLower.includes('slogan')) {
    issues.push('prompt_missing_typography')
    qualityScore -= 10
  }

  qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)))
  ipRisk = Math.max(0, Math.min(100, Math.round(ipRisk)))
  safetyScore = Math.max(0, Math.min(100, Math.round(safetyScore)))

  let decision: SafetyDecision = 'PASS'
  if (blocked.triggered.length || ipRisk >= 50 || safetyScore < 70) {
    decision = 'REJECT'
  } else if (
    qualityScore < threshold ||
    ipRisk >= 25 ||
    issues.includes('official_licensed_language') ||
    (issues.length > 0 && qualityScore < threshold + 5)
  ) {
    decision = 'REVIEW'
  }

  // If uncertain on quality near threshold → REVIEW
  if (decision === 'PASS' && qualityScore < threshold + 3) {
    decision = 'REVIEW'
    issues.push('near_threshold_uncertainty')
  }

  return {
    qualityScore,
    ipRisk,
    safetyScore,
    issues,
    decision,
    threshold,
    reviewedAt: new Date().toISOString(),
    disclaimer:
      'Image review is automated risk reduction only — not legal clearance. Uncertain designs stay in REVIEW and are never auto-published.',
  }
}
