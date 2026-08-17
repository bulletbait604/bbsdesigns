import type { SafetyDecision, SafetyStageResult } from '@/services/safety/types'

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Stage 6 — final decision.
 * Hard reject rules always win. High commercial/trend score is irrelevant here.
 */
export function finalizeSafetyDecision(input: {
  stages: SafetyStageResult[]
  imageReviewTriggered?: string[]
}): {
  decision: SafetyDecision
  score: number
  ipRisk: number
  safetyRisk: number
  reasons: string[]
  ipRiskFlags: string[]
  tosRiskFlags: string[]
  finalStage: SafetyStageResult
} {
  const allTriggers = input.stages.flatMap((s) => s.triggered)
  if (input.imageReviewTriggered?.length) {
    allTriggers.push(...input.imageReviewTriggered)
  }

  const ipRiskFlags = allTriggers.filter((t) => t.startsWith('ip:'))
  const tosRiskFlags = allTriggers.filter(
    (t) =>
      t.startsWith('hard_block:') ||
      t.startsWith('explicit:') ||
      t.startsWith('violence:') ||
      t === 'ai:reject'
  )

  const riskSum = input.stages.reduce((acc, s) => acc + s.riskDelta, 0)
  const safetyRisk = clamp(riskSum)
  const ipRisk = clamp(ipRiskFlags.length * 30 + (allTriggers.includes('ai:reject') ? 20 : 0))
  const score = clamp(100 - Math.max(safetyRisk, ipRisk * 0.8))

  const hardIpHit = ipRiskFlags.some(
    (f) => f.startsWith('ip:') && !f.includes('official_licensed_pattern')
  )
  const softIpHit = ipRiskFlags.some((f) => f.includes('official_licensed_pattern'))

  const hardReject =
    tosRiskFlags.length > 0 ||
    hardIpHit ||
    allTriggers.includes('ai:reject') ||
    allTriggers.includes('heuristic:escalate_reject') ||
    (input.imageReviewTriggered || []).some((t) => t.includes('reject'))

  const needsReview =
    !hardReject &&
    (allTriggers.includes('ai:review') ||
      allTriggers.includes('heuristic:escalate_review') ||
      softIpHit ||
      score < 90)

  let decision: SafetyDecision = 'PASS'
  if (hardReject) decision = 'REJECT'
  else if (needsReview) decision = 'REVIEW'

  const reasons: string[] = []
  if (decision === 'REJECT') reasons.push('Hard-reject policy triggered (REJECT always wins).')
  if (decision === 'REVIEW') reasons.push('Uncertainty or elevated risk — human REVIEW required.')
  if (decision === 'PASS') reasons.push('No hard-reject markers; passed automated gates.')
  reasons.push(...input.stages.flatMap((s) => s.notes).slice(0, 6))

  const finalStage: SafetyStageResult = {
    stage: 'final',
    triggered: [decision],
    notes: [
      `Final decision ${decision}. Score ${score}. This is risk reduction, not legal clearance.`,
    ],
    riskDelta: 0,
  }

  return {
    decision,
    score,
    ipRisk,
    safetyRisk,
    reasons,
    ipRiskFlags,
    tosRiskFlags,
    finalStage,
  }
}
