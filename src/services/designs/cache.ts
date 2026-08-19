import { createHash } from 'crypto'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { CachedDesign } from '@/models/CachedDesign'
import { logger } from '@/lib/logger'
import { DESIGN_PROMPT_VERSION } from '@/services/designs/types'
import type { Niche } from '@/types'
import type { DesignPipelineResult, GeneratedDesignRecord } from '@/services/designs/types'
import type { ImageReviewResult } from '@/services/designs/types'

/** Normalize Mongo Binary / Uint8Array / Buffer into a Node Buffer. */
export function toNodeBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  if (data && typeof data === 'object') {
    const maybe = data as {
      buffer?: ArrayBuffer
      byteOffset?: number
      byteLength?: number
      value?: () => Buffer
    }
    if (typeof maybe.value === 'function') {
      try {
        return maybe.value()
      } catch {
        // fall through
      }
    }
    if (maybe.buffer instanceof ArrayBuffer) {
      return Buffer.from(maybe.buffer, maybe.byteOffset ?? 0, maybe.byteLength ?? maybe.buffer.byteLength)
    }
  }
  return Buffer.from(data as ArrayBuffer)
}

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

  const bytes = toNodeBuffer(doc.imageBytes)

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

  const byId = await CachedDesign.findById(id).lean()
  if (byId?.imageBytes) {
    return { bytes: toNodeBuffer(byId.imageBytes), mimeType: byId.mimeType || 'image/png' }
  }

  // Recover after cold starts / id drift: Design.assetKey → latest raster cache for slogan
  const { Design } = await import('@/models/Design')
  const design = await Design.findOne({
    $or: [{ assetKey: id }, { 'provenance.imageAssetKey': id }],
  })
    .select({ slogan: 1, niche: 1, promptVersion: 1 })
    .lean()

  if (!design?.slogan) return null

  const bySlogan = await CachedDesign.findOne({
    slogan: design.slogan,
    niche: design.niche,
    mimeType: { $ne: 'image/svg+xml' },
    imageBytes: { $exists: true },
  })
    .sort({ updatedAt: -1 })
    .lean()

  if (!bySlogan?.imageBytes) return null

  return { bytes: toNodeBuffer(bySlogan.imageBytes), mimeType: bySlogan.mimeType || 'image/png' }
}

/** True when a CachedDesign document still has raster bytes for this asset id. */
export async function cachedDesignIdsWithBytes(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  if (!isMongoConfigured() || !ids.length) return out
  await connectMongo()
  const unique = [...new Set(ids.filter((id) => Boolean(id) && /^[a-f\d]{24}$/i.test(id)))]
  if (!unique.length) return out
  const docs = await CachedDesign.find()
    .where('_id')
    .in(unique)
    .where('imageBytes')
    .exists(true)
    .select({ _id: 1 })
    .lean()
  for (const d of docs) out.add(String(d._id))
  return out
}
