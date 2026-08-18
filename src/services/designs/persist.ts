import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Design } from '@/models/Design'
import { logger } from '@/lib/logger'
import type { DesignPipelineResult } from '@/services/designs/types'

/** Persist or replace design for an idea (upgrades svg-preview placeholders to AI art). */
export async function upsertDesignResult(input: {
  result: DesignPipelineResult
  storeId: string
  brandId: string
  ideaId: string
}): Promise<string | null> {
  if (!isMongoConfigured()) {
    logger.info('design_upsert_skipped_no_mongo')
    return null
  }

  const { design, review } = input.result
  await connectMongo()

  const doc = await Design.findOneAndUpdate(
    { ideaId: input.ideaId },
    {
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
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  logger.info('design_upserted', { id: String(doc._id), provider: design.provider })
  return String(doc._id)
}

/** Persist design + review provenance when Mongo is configured. */
export async function persistDesignResult(input: {
  result: DesignPipelineResult
  storeId: string
  brandId: string
  ideaId: string
}): Promise<string | null> {
  return upsertDesignResult(input)
}
