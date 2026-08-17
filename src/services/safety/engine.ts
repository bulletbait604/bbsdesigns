import { SAFETY_POLICY_VERSION } from '@/services/safety/types'
import { normalizeSafetyText } from '@/services/safety/normalize'
import { runBlockedTermStage } from '@/services/safety/blockedTerms'
import { runIpRiskStage } from '@/services/safety/ipRisk'
import { runAiTextReviewStage } from '@/services/safety/aiReview'
import { finalizeSafetyDecision } from '@/services/safety/decide'
import type { SafetyReviewInput, SafetyReviewResult, SafetyStageResult } from '@/services/safety/types'

/**
 * Multi-stage safety engine for text (and optional image summary placeholder).
 * Stage 5 image review is a stub until design assets exist.
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

  // Stage 5 placeholder — full image review arrives with design engine
  const imageTriggers: string[] = []
  if (input.imageSummary) {
    const imageNorm = normalizeSafetyText(input.imageSummary)
    const imageIp = runIpRiskStage(imageNorm)
    const imageBlocked = runBlockedTermStage(imageNorm)
    imageTriggers.push(...imageIp.triggered, ...imageBlocked.triggered)
    stages.push({
      stage: 'image_review',
      triggered: imageTriggers,
      notes: ['Image review used text summary placeholder until asset pipeline exists.'],
      riskDelta: Math.min(100, imageIp.riskDelta + imageBlocked.riskDelta),
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

  return {
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
}

/** First safety gate for slogan candidates — reject always wins. */
export function passesFirstSafetyGate(result: SafetyReviewResult): boolean {
  return result.decision === 'PASS' || result.decision === 'REVIEW'
}
