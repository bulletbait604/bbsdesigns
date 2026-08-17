import { SAFETY_POLICY_VERSION } from '@/services/safety/types'
import { normalizeSafetyText } from '@/services/safety/normalize'
import { runBlockedTermStage } from '@/services/safety/blockedTerms'
import { runIpRiskStage } from '@/services/safety/ipRisk'
import { runAiTextReviewStage } from '@/services/safety/aiReview'
import { finalizeSafetyDecision } from '@/services/safety/decide'
import { logSafetyDecision } from '@/services/safety/log'
import { reviewGeneratedImage } from '@/services/designs/imageReview'
import type { SafetyReviewInput, SafetyReviewResult, SafetyStageResult } from '@/services/safety/types'

/**
 * Multi-stage safety engine.
 * Stage 5 uses design image review when image context is provided.
 */
export async function reviewContentSafety(input: SafetyReviewInput): Promise<SafetyReviewResult> {
  const normalizedText = normalizeSafetyText(input.text)
  const stages: SafetyStageResult[] = [
    {
      stage: 'normalize',
      triggered: [],
      notes: ['Text normalized for matching.'],
      riskDelta: 0,
    },
  ]

  const blocked = runBlockedTermStage(normalizedText)
  stages.push(blocked)

  const ip = runIpRiskStage(normalizedText)
  stages.push(ip)

  const priorTriggers = [...blocked.triggered, ...ip.triggered]
  let provider = 'heuristic'
  let model = 'heuristic-v1'
  let modelResponse = ''

  if (input.runAiReview !== false) {
    const ai = await runAiTextReviewStage({
      text: input.text,
      normalizedText,
      priorTriggers,
    })
    stages.push(ai.stage)
    provider = ai.provider
    model = ai.model
    modelResponse = ai.modelResponse
  } else {
    stages.push({
      stage: 'ai_text_review',
      triggered: ['ai:skipped'],
      notes: ['AI text review skipped by caller.'],
      riskDelta: 0,
    })
  }

  const imageTriggers: string[] = []
  if (input.imageSummary) {
    const imageReview = reviewGeneratedImage({
      slogan: input.text.slice(0, 80),
      prompt: input.imageSummary,
      niche: input.niche || 'gaming',
      bytesLength: input.imageBytesLength ?? 2048,
      mimeType: input.imageMimeType ?? 'image/png',
    })
    imageTriggers.push(
      ...imageReview.issues,
      `image_decision:${imageReview.decision}`,
      ...(imageReview.decision === 'REJECT' ? ['image:reject'] : [])
    )
    stages.push({
      stage: 'image_review',
      triggered: imageTriggers,
      notes: [
        `Image review decision ${imageReview.decision} (quality ${imageReview.qualityScore}, ip ${imageReview.ipRisk}).`,
      ],
      riskDelta:
        imageReview.decision === 'REJECT'
          ? 60
          : imageReview.decision === 'REVIEW'
            ? 20
            : 0,
    })
  } else {
    stages.push({
      stage: 'image_review',
      triggered: ['image:pending'],
      notes: ['No image yet — image stage deferred.'],
      riskDelta: 0,
    })
  }

  const final = finalizeSafetyDecision({
    stages,
    imageReviewTriggered: imageTriggers,
  })
  stages.push(final.finalStage)

  const result: SafetyReviewResult = {
    decision: final.decision,
    score: final.score,
    ipRisk: final.ipRisk,
    safetyRisk: final.safetyRisk,
    reasons: final.reasons,
    ipRiskFlags: final.ipRiskFlags,
    tosRiskFlags: final.tosRiskFlags,
    stages,
    policyVersion: SAFETY_POLICY_VERSION,
    normalizedText,
    provider,
    model,
    modelResponse,
    reviewedAt: new Date().toISOString(),
    disclaimer:
      'Safety decisions reduce risk only and never constitute legal clearance or trademark advice.',
  }

  if (input.persistLog !== false) {
    await logSafetyDecision({
      result,
      targetType: input.targetType || 'text',
      targetId: input.targetId,
      storeId: input.storeId,
      brandId: input.brandId,
    })
  }

  return result
}

/** First safety gate for slogan candidates — reject always wins. */
export function passesFirstSafetyGate(result: SafetyReviewResult): boolean {
  return result.decision === 'PASS' || result.decision === 'REVIEW'
}
