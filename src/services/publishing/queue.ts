import { createHash } from 'crypto'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { PublishingJob } from '@/models/PublishingJob'
import type { SafetyDecision, Niche } from '@/types'

export type PublishingQueueStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'REJECTED'

export type PublishingCandidate = {
  title: string
  description: string
  tags: string[]
  priceCents: number
  mediaUrls: string[]
  variantSkus: string[]
  sloganSafety: SafetyDecision
  imageSafety: SafetyDecision
  qualityScore: number
  idempotencyKey?: string
  storeId?: string
  brandId?: string
  productId?: string
  ideaId?: string
  designId?: string
  niche?: Niche
}

export type PublishingQueueItem = {
  id: string
  status: PublishingQueueStatus
  idempotencyKey: string
  validationErrors: string[]
  attempts: number
  maxAttempts: number
  lastError?: string | null
  payload: PublishingCandidate
  createdAt: string
}

const memoryQueue = new Map<string, PublishingQueueItem>()

export function buildPublishingIdempotencyKey(candidate: PublishingCandidate): string {
  if (candidate.idempotencyKey) return candidate.idempotencyKey
  return createHash('sha256')
    .update(
      [
        candidate.title,
        candidate.priceCents,
        candidate.mediaUrls.join(','),
        candidate.variantSkus.join(','),
      ].join('|')
    )
    .digest('hex')
    .slice(0, 32)
}

/**
 * A product is READY only if all gates pass.
 */
export function validateReadyForReview(candidate: PublishingCandidate): string[] {
  const env = getEnv()
  const errors: string[] = []

  if (candidate.sloganSafety !== 'PASS') {
    errors.push(`slogan_safety_not_pass:${candidate.sloganSafety}`)
  }
  if (candidate.imageSafety !== 'PASS') {
    errors.push(`image_safety_not_pass:${candidate.imageSafety}`)
  }
  if (candidate.qualityScore < env.MIN_DESIGN_QUALITY_SCORE) {
    errors.push(
      `quality_below_threshold:${candidate.qualityScore}<${env.MIN_DESIGN_QUALITY_SCORE}`
    )
  }
  if (!candidate.title.trim() || candidate.title.trim().length < 3) {
    errors.push('invalid_title')
  }
  if (!candidate.description.trim() || candidate.description.trim().length < 10) {
    errors.push('invalid_description')
  }
  if (!candidate.tags.length) {
    errors.push('tags_required')
  }
  if (!Number.isFinite(candidate.priceCents) || candidate.priceCents <= 0) {
    errors.push('invalid_price')
  }
  if (!candidate.mediaUrls.length) {
    errors.push('media_required')
  }
  if (!candidate.variantSkus.length) {
    errors.push('variants_required')
  }

  return errors
}

export function enqueuePublishingCandidate(candidate: PublishingCandidate): PublishingQueueItem {
  const idempotencyKey = buildPublishingIdempotencyKey(candidate)
  const existing = memoryQueue.get(idempotencyKey)
  if (existing) return existing

  const validationErrors = validateReadyForReview(candidate)
  let status: PublishingQueueStatus = 'DRAFT'

  if (candidate.sloganSafety === 'REJECT' || candidate.imageSafety === 'REJECT') {
    status = 'REJECTED'
  } else if (validationErrors.length === 0) {
    status = 'READY_FOR_REVIEW'
  }

  const item: PublishingQueueItem = {
    id: `pub_${idempotencyKey}`,
    status,
    idempotencyKey,
    validationErrors,
    attempts: 0,
    maxAttempts: 5,
    lastError: null,
    payload: candidate,
    createdAt: new Date().toISOString(),
  }

  memoryQueue.set(idempotencyKey, item)
  logger.info('publishing_enqueued', {
    id: item.id,
    status: item.status,
    validationErrors,
  })

  void persistQueueItem(item)
  return item
}

export function approvePublishingItem(idempotencyKey: string): PublishingQueueItem {
  const item = memoryQueue.get(idempotencyKey)
  if (!item) throw new Error(`Queue item not found: ${idempotencyKey}`)
  if (item.status === 'REJECTED') throw new Error('Cannot approve rejected item')
  if (item.validationErrors.length) {
    throw new Error(`Cannot approve: ${item.validationErrors.join(', ')}`)
  }
  item.status = 'APPROVED'
  void persistQueueItem(item)
  return item
}

/**
 * Process an approved item through publishing stages with retries.
 * Does not flip AUTO_PUBLISH; caller must already have APPROVED status.
 */
export async function processPublishingItem(
  idempotencyKey: string,
  handlers: {
    createShopifyDraft: (item: PublishingQueueItem) => Promise<{ id: string }>
    syncPrintify: (item: PublishingQueueItem, shopifyId: string) => Promise<{ id: string }>
  }
): Promise<PublishingQueueItem> {
  const item = memoryQueue.get(idempotencyKey)
  if (!item) throw new Error(`Queue item not found: ${idempotencyKey}`)
  if (item.status !== 'APPROVED' && item.status !== 'FAILED') {
    throw new Error(`Item not processable from status ${item.status}`)
  }

  item.status = 'PUBLISHING'
  item.attempts += 1
  item.lastError = null

  try {
    const shopify = await handlers.createShopifyDraft(item)
    const printify = await handlers.syncPrintify(item, shopify.id)
    item.status = 'PUBLISHED'
    item.payload = {
      ...item.payload,
      // stash external ids in tags metadata-style without schema churn
      tags: [...item.payload.tags, `shopify:${shopify.id}`, `printify:${printify.id}`],
    }
  } catch (error) {
    item.lastError = error instanceof Error ? error.message : String(error)
    item.status = item.attempts >= item.maxAttempts ? 'FAILED' : 'FAILED'
    logger.warn('publishing_failed', {
      id: item.id,
      attempt: item.attempts,
      error: item.lastError,
    })
  }

  void persistQueueItem(item)
  return item
}

export function getPublishingItem(idempotencyKey: string): PublishingQueueItem | undefined {
  return memoryQueue.get(idempotencyKey)
}

export function listPublishingQueue(): PublishingQueueItem[] {
  return [...memoryQueue.values()]
}

export function clearPublishingQueue(): void {
  memoryQueue.clear()
}

async function persistQueueItem(item: PublishingQueueItem): Promise<void> {
  if (!isMongoConfigured()) return
  try {
    await connectMongo()
    await PublishingJob.findOneAndUpdate(
      { idempotencyKey: item.idempotencyKey },
      {
        idempotencyKey: item.idempotencyKey,
        storeId: item.payload.storeId || undefined,
        brandId: item.payload.brandId || undefined,
        productId: item.payload.productId || undefined,
        stage: item.status === 'PUBLISHED' ? 'publish' : 'validate',
        status: item.status,
        attempts: item.attempts,
        maxAttempts: item.maxAttempts,
        lastError: item.lastError,
        validationErrors: item.validationErrors,
        payload: item.payload,
        finishedAt: ['PUBLISHED', 'FAILED', 'REJECTED'].includes(item.status)
          ? new Date()
          : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  } catch (error) {
    logger.error('publishing_persist_failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
