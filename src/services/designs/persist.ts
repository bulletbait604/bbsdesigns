import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Design } from '@/models/Design'
import { logger } from '@/lib/logger'
import type { DesignPipelineResult } from '@/services/designs/types'

/** Persist design + review provenance when Mongo is configured. */
export async function persistDesignResult(input: {
  result: DesignPipelineResult
  storeId: string
  brandId: string
  ideaId: string
}): Promise<string | null> {
  if (!isMongoConfigured()) {
    logger.info('design_persist_skipped_no_mongo')
    return null
  }

  const { design, review } = input.result
  await connectMongo()

  const doc = await Design.create({
    storeId: input.storeId,
    brandId: input.brandId,
    ideaId: input.ideaId,
    niche: design.niche,
    title: design.slogan,
    slogan: design.slogan,
    provider: design.provider,
    model: design.model,
    prompt: design.prompt,
    negativePrompt: design.negativePrompt,
    promptVersion: design.promptVersion,
    assetKey: design.assetKey,
    assetUrl: design.assetUrl,
    mimeType: design.mimeType,
    width: design.width,
    height: design.height,
    qualityScore: review.qualityScore,
    ipRisk: review.ipRisk,
    safetyScore: review.safetyScore,
    imageReviewDecision: review.decision,
    status: design.status,
    provenance: {
      sourceTrendIds: [],
      ideaId: input.ideaId,
      promptVersion: design.promptVersion,
      modelProvider: design.provider,
      modelName: design.model,
      imageAssetKey: design.assetKey,
      qualityScore: review.qualityScore,
      safetyScore: review.safetyScore,
      safetyDecision: review.decision,
      publishStatus: review.decision === 'REJECT' ? 'rejected' : 'awaiting_approval',
    },
  })

  logger.info('design_persisted', { id: String(doc._id), decision: review.decision })
  return String(doc._id)
}
