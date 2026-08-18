import { getFeatureFlags } from '@/lib/featureFlags'
import type { CreativeBrief, DesignReviewScores, DesignReviewV2Result } from '@/services/designV2/types'

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * Strict design reviewer (Part 19).
 * Pre-image: scores the creative brief + prompt quality.
 * Post-image: also weighs bytes/mime and optional overall quality hint.
 */
export function reviewDesignV2(input: {
  brief: CreativeBrief
  prompt: string
  negativePrompt: string
  bytesLength?: number
  mimeType?: string
  /** Optional post-gen quality hint from legacy review */
  qualityHint?: number
}): DesignReviewV2Result {
  const flags = getFeatureFlags()
  const gates = {
    overallMin: flags.minDesignOverallScore,
    visualImpactMin: 80,
    commercialAppealMin: 80,
    typographyMin: 80,
  }

  const reasons: string[] = []
  const promptLower = input.prompt.toLowerCase()
  const primary = input.brief.primaryText.trim()

  let visualImpact = 78
  let professionalism = 78
  let originality = 80
  let printability = 82
  let typography = 78
  let composition = 78
  let trendFit = 78
  let audienceFit = 78
  let commercialAppeal = 78
  let viralPotential = 70
  let ipRisk = 10

  // Strong brief signals
  if (input.brief.visualDominancePct >= 55) visualImpact += 8
  if (input.brief.typographyTreatment) typography += 8
  if (input.brief.secondaryText) typography += 4
  if (input.brief.colors.length >= 4) commercialAppeal += 6
  if (/integrated|composition|silhouette|typography/.test(promptLower)) composition += 10
  if (/original|invent/.test(promptLower)) originality += 8
  if (input.negativePrompt.toLowerCase().includes('no logos')) professionalism += 5
  if (/CREATE AN ORIGINAL COMMERCIAL APPAREL GRAPHIC/i.test(input.prompt)) {
    visualImpact += 4
    commercialAppeal += 4
    professionalism += 4
  }
  if (primary.length >= 4 && primary.length <= 36) typography += 6
  else {
    typography -= 15
    reasons.push('weak_primary_typography_length')
  }

  // Reject boring patterns in brief
  if (/plain text|text only|minimalist slogan/i.test(input.brief.composition)) {
    visualImpact -= 30
    reasons.push('boring_text_first_brief')
  }
  if (!promptLower.includes('primary typography') && !promptLower.includes('typography')) {
    typography -= 20
    reasons.push('prompt_missing_typography_block')
  }
  if (!/(character|illustration|mascot|subject)/.test(promptLower)) {
    visualImpact -= 20
    reasons.push('prompt_missing_visual_subject')
  }

  // IP
  const ipHits = primary.match(
    /\b(nfl|nba|mlb|disney|marvel|pokemon|nintendo|official|licensed|authentic)\b/i
  )
  if (ipHits) {
    ipRisk += 40
    reasons.push(`ip_language:${ipHits[0]}`)
  }

  if (input.bytesLength != null) {
    if (input.bytesLength < 2048) {
      printability -= 25
      visualImpact -= 15
      reasons.push('asset_too_small')
    } else if (input.bytesLength > 50_000) {
      printability += 5
      visualImpact += 5
    }
  }
  if (input.mimeType && !input.mimeType.startsWith('image/')) {
    printability -= 40
    reasons.push('invalid_mime')
  }
  if (input.qualityHint != null) {
    const delta = (input.qualityHint - 80) / 4
    visualImpact += delta
    professionalism += delta
  }

  // Style-appropriate boost
  if (input.brief.styleLabel) {
    commercialAppeal += 5
    trendFit += 5
    audienceFit += 5
  }
  viralPotential += Math.min(15, Math.floor(visualImpact / 10))

  const scores: DesignReviewScores = {
    visualImpact: clamp(visualImpact),
    professionalism: clamp(professionalism),
    originality: clamp(originality),
    printability: clamp(printability),
    typography: clamp(typography),
    composition: clamp(composition),
    trendFit: clamp(trendFit),
    audienceFit: clamp(audienceFit),
    commercialAppeal: clamp(commercialAppeal),
    viralPotential: clamp(viralPotential),
    ipRisk: clamp(ipRisk),
    overallScore: 0,
  }

  scores.overallScore = clamp(
    scores.visualImpact * 0.18 +
      scores.commercialAppeal * 0.18 +
      scores.typography * 0.14 +
      scores.composition * 0.12 +
      scores.originality * 0.1 +
      scores.printability * 0.1 +
      scores.trendFit * 0.08 +
      scores.audienceFit * 0.05 +
      scores.professionalism * 0.05 -
      scores.ipRisk * 0.2
  )

  // Final quality gate questions (Part 35) — fail if multiple NO
  let noCount = 0
  if (scores.visualImpact < 75) {
    noCount += 1
    reasons.push('weak_from_distance')
  }
  if (scores.typography < 75) {
    noCount += 1
    reasons.push('typography_not_integrated')
  }
  if (scores.originality < 70) {
    noCount += 1
    reasons.push('not_original_enough')
  }
  if (scores.ipRisk >= 40) {
    noCount += 1
    reasons.push('ip_risk_high')
  }
  if (scores.commercialAppeal < 75) {
    noCount += 1
    reasons.push('low_commercial_appeal')
  }

  let decision: DesignReviewV2Result['decision'] = 'PASS'
  if (
    scores.ipRisk >= 50 ||
    scores.overallScore < gates.overallMin - 15 ||
    reasons.includes('boring_text_first_brief')
  ) {
    decision = 'REJECT'
    reasons.push('hard_reject')
  } else if (
    scores.overallScore < gates.overallMin ||
    scores.visualImpact < gates.visualImpactMin ||
    scores.commercialAppeal < gates.commercialAppealMin ||
    scores.typography < gates.typographyMin ||
    noCount >= 2
  ) {
    decision = 'REJECT'
    reasons.push('below_v2_quality_gates')
  } else if (scores.overallScore < gates.overallMin + 3 || noCount === 1) {
    decision = 'REVIEW'
    reasons.push('near_gate_uncertainty')
  }

  return {
    scores,
    decision,
    reasons,
    gates,
    reviewedAt: new Date().toISOString(),
  }
}
