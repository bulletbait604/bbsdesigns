import { logger } from '@/lib/logger'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { SafetyReview } from '@/models/SafetyReview'
import { AuditLog } from '@/models/AuditLog'
import type { SafetyReviewResult } from '@/services/safety/types'

/** Always log safety decisions; persist to Mongo when configured. */
export async function logSafetyDecision(input: {
  result: SafetyReviewResult
  targetType: 'idea' | 'design' | 'product' | 'slogan' | 'text'
  targetId?: string
  storeId?: string
  brandId?: string
}): Promise<void> {
  const { result } = input
  const rulesTriggered = result.stages.flatMap((s) => s.triggered)

  logger.info('safety_decision', {
    decision: result.decision,
    score: result.score,
    ipRisk: result.ipRisk,
    safetyRisk: result.safetyRisk,
    policyVersion: result.policyVersion,
    provider: result.provider,
    model: result.model,
    rulesTriggered,
    reasons: result.reasons,
    input: result.normalizedText.slice(0, 500),
    modelResponse: result.modelResponse.slice(0, 1000),
    reviewedAt: result.reviewedAt,
    targetType: input.targetType,
  })

  if (!isMongoConfigured()) return

  try {
    await connectMongo()
    await SafetyReview.create({
      storeId: input.storeId || undefined,
      brandId: input.brandId || undefined,
      targetType: input.targetType,
      targetId: input.targetId || undefined,
      inputText: result.normalizedText,
      decision: result.decision,
      score: result.score,
      ipRisk: result.ipRisk,
      safetyRisk: result.safetyRisk,
      reasons: result.reasons,
      rulesTriggered,
      ipRiskFlags: result.ipRiskFlags,
      tosRiskFlags: result.tosRiskFlags,
      stages: result.stages,
      modelProvider: result.provider,
      modelName: result.model,
      modelResponse: result.modelResponse,
      policyVersion: result.policyVersion,
      promptVersion: result.policyVersion,
      status: 'complete',
    })

    await AuditLog.create({
      storeId: input.storeId || undefined,
      actor: 'safety-engine',
      action: 'safety.review',
      entityType: input.targetType,
      entityId: input.targetId || null,
      status: result.decision === 'REJECT' ? 'warning' : 'success',
      message: `Safety ${result.decision} (score ${result.score})`,
      metadata: {
        policyVersion: result.policyVersion,
        provider: result.provider,
        model: result.model,
        rulesTriggered,
      },
    })
  } catch (error) {
    logger.error('safety_persist_failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
