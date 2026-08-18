import { createHash } from 'crypto'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { CachedDesign } from '@/models/CachedDesign'
import { logger } from '@/lib/logger'
import { DESIGN_PROMPT_VERSION } from '@/services/designs/types'
import type { Niche } from '@/types'
import type { DesignPipelineResult, GeneratedDesignRecord } from '@/services/designs/types'
import type { ImageReviewResult } from '@/services/designs/types'

export function buildDesignCacheKey(input: {
  niche: Niche
  slogan: string
  concept?: string
  promptVersion?: string
  model?: string
}): string {
  return createHash('sha256')
    .update(
      [
        input.niche,
        input.slogan.trim().toLowerCase(),
        (input.concept || '').trim().toLowerCase(),
        input.promptVersion || DESIGN_PROMPT_VERSION,
        input.model || '',
      ].join('|')
    )
    .digest('hex')
    .slice(0, 40)
}

export type CachedDesignHit = {
  id: string
  cacheKey: string
  fromCache: true
  design: GeneratedDesignRecord
  review: ImageReviewResult
  bytes: Buffer
  previewUrl: string
}

export async function findCachedDesign(cacheKey: string): Promise<CachedDesignHit | null> {
  if (!isMongoConfigured()) return null
  await connectMongo()

  const doc = await CachedDesign.findOneAndUpdate(
    { cacheKey },
    { $inc: { hitCount: 1 }, $set: { lastHitAt: new Date() } },
    { new: true }
  ).lean()

  if (!doc || !doc.imageBytes) return null

  const bytes = Buffer.isBuffer(doc.imageBytes)
    ? doc.imageBytes
    : Buffer.from(doc.imageBytes as unknown as ArrayBuffer)

  const id = String(doc._id)
  logger.info('design_cache_hit', { cacheKey, id, hitCount: doc.hitCount })

  const design: GeneratedDesignRecord = {
    provider: doc.provider,
    model: doc.model,
    prompt: doc.prompt,
    negativePrompt: doc.negativePrompt || '',
    promptVersion: doc.promptVersion,
    slogan: doc.slogan,
    niche: doc.niche as Niche,
    assetKey: id,
    assetUrl: `/api/design-assets/${id}`,
    mimeType: doc.mimeType || 'image/png',
    width: doc.width || 1024,
    height: doc.height || 1024,
    status: (doc.status as GeneratedDesignRecord['status']) || 'review',
    createdAt: (doc.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
  }

  const review: ImageReviewResult = {
    qualityScore: doc.qualityScore ?? 0,
    ipRisk: doc.ipRisk ?? 0,
    safetyScore: doc.safetyScore ?? 0,
    issues: [],
    decision: (doc.imageReviewDecision as ImageReviewResult['decision']) || 'REVIEW',
    threshold: 85,
    reviewedAt: new Date().toISOString(),
    disclaimer: 'Served from MongoDB design cache — no new image API call.',
  }

  return {
    id,
    cacheKey,
    fromCache: true,
    design,
    review,
    bytes,
    previewUrl: `/api/design-assets/${id}`,
  }
}

export async function saveCachedDesign(input: {
  cacheKey: string
  niche: Niche
  slogan: string
  concept?: string
  result: DesignPipelineResult
}): Promise<string | null> {
  if (!isMongoConfigured()) return null
  await connectMongo()

  const { result } = input
  const doc = await CachedDesign.findOneAndUpdate(
    { cacheKey: input.cacheKey },
    {
      cacheKey: input.cacheKey,
      niche: input.niche,
      slogan: input.slogan,
      concept: input.concept || '',
      provider: result.design.provider,
      model: result.design.model,
      prompt: result.design.prompt,
      negativePrompt: result.design.negativePrompt,
      promptVersion: result.design.promptVersion,
      mimeType: result.design.mimeType,
      width: result.design.width,
      height: result.design.height,
      imageBytes: result.bytes,
      qualityScore: result.review.qualityScore,
      ipRisk: result.review.ipRisk,
      safetyScore: result.review.safetyScore,
      imageReviewDecision: result.review.decision,
      status: result.design.status,
      hitCount: 0,
      lastHitAt: null,
    },
    { upsert: true, new: true }
  )

  logger.info('design_cache_saved', { cacheKey: input.cacheKey, id: String(doc._id) })
  return String(doc._id)
}

export async function getCachedDesignBytes(id: string): Promise<{
  bytes: Buffer
  mimeType: string
} | null> {
  if (!isMongoConfigured()) return null
  await connectMongo()

  const doc = await CachedDesign.findById(id).lean()
  if (!doc?.imageBytes) return null
  const bytes = Buffer.isBuffer(doc.imageBytes)
    ? doc.imageBytes
    : Buffer.from(doc.imageBytes as unknown as ArrayBuffer)
  return { bytes, mimeType: doc.mimeType || 'image/png' }
}
