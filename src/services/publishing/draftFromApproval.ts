import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { createShopifyProductDraft } from '@/services/shopify/draft'
import {
  approvePublishingItemAsync,
  enqueuePublishingCandidate,
  getPublishingItemAsync,
  hydratePublishingQueueFromMongo,
  listPublishingQueue,
  processPublishingItem,
  type PublishingCandidate,
  type PublishingQueueItem,
} from '@/services/publishing/queue'
import { prepareListing } from '@/services/listings/prepare'
import type { Niche, SafetyDecision } from '@/types'

/** Make media URLs absolute for Shopify (relative /api paths need APP_URL). */
export function toAbsoluteMediaUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  const base = getEnv().APP_URL.replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

export function enqueueListingForDraft(input: {
  niche: Niche
  slogan: string
  concept?: string
  mediaUrls: string[]
  sloganSafety: SafetyDecision
  imageSafety: SafetyDecision
  qualityScore: number
  ideaId?: string
  designId?: string
  storeId?: string
  brandId?: string
}): PublishingQueueItem {
  const listing = prepareListing({
    niche: input.niche,
    slogan: input.slogan,
    concept: input.concept,
    mediaUrls: input.mediaUrls.map(toAbsoluteMediaUrl),
    ideaId: input.ideaId,
    designId: input.designId,
  })

  const candidate: PublishingCandidate = {
    title: listing.title,
    description: listing.description,
    tags: listing.tags,
    priceCents: listing.priceCents,
    mediaUrls: listing.mediaUrls,
    variantSkus: listing.variantSkus,
    sloganSafety: input.sloganSafety,
    imageSafety: input.imageSafety,
    qualityScore: input.qualityScore,
    idempotencyKey: input.designId
      ? `draft:${input.designId}`
      : `draft:${input.ideaId || listing.title}`,
    storeId: input.storeId,
    brandId: input.brandId,
    ideaId: input.ideaId,
    designId: input.designId,
    niche: input.niche,
  }

  return enqueuePublishingCandidate(candidate)
}

/**
 * Approve + create Shopify DRAFT (never ACTIVE). Optionally sync Printify when configured.
 * Blocked unless slogan+image safety are PASS and quality threshold met.
 */
export async function createDraftFromQueueItem(
  idempotencyKey: string
): Promise<PublishingQueueItem> {
  const env = getEnv()
  bootstrapProviders()

  let item = await getPublishingItemAsync(idempotencyKey)
  if (!item) throw new Error('Publishing queue item not found')

  if (item.status === 'REJECTED') throw new Error('Cannot draft a REJECTED item')
  if (item.payload.sloganSafety !== 'PASS' || item.payload.imageSafety !== 'PASS') {
    throw new Error('Safety must be PASS for slogan and image before Shopify draft')
  }
  if (item.payload.qualityScore < env.MIN_DESIGN_QUALITY_SCORE) {
    throw new Error(
      `Quality ${item.payload.qualityScore} below MIN_DESIGN_QUALITY_SCORE ${env.MIN_DESIGN_QUALITY_SCORE}`
    )
  }

  if (item.status === 'READY_FOR_REVIEW' || item.status === 'DRAFT') {
    if (item.validationErrors.length) {
      throw new Error(`Cannot approve: ${item.validationErrors.join(', ')}`)
    }
    item = await approvePublishingItemAsync(idempotencyKey)
  }

  if (item.status !== 'APPROVED' && item.status !== 'FAILED') {
    if (item.status === 'PUBLISHED') return item
    throw new Error(`Item not processable from status ${item.status}`)
  }

  const shopify = tryGetProvider('shopify')
  if (!shopify || !shopify.validateConfig().ok) {
    throw new Error('Shopify is not configured (SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN)')
  }

  const processed = await processPublishingItem(idempotencyKey, {
    createShopifyDraft: async (q) => {
      const result = await createShopifyProductDraft({
        title: q.payload.title,
        descriptionHtml: `<p>${q.payload.description}</p>`,
        tags: q.payload.tags,
        vendor: 'BBS Designs',
        productType: 'T-Shirt',
        media: q.payload.mediaUrls.map((u) => ({
          originalSource: toAbsoluteMediaUrl(u),
          alt: q.payload.title,
        })),
        price: (q.payload.priceCents / 100).toFixed(2),
        sku: q.payload.variantSkus[0] || 'TEE-M',
        safetyDecision: 'PASS',
        idempotencyKey: q.idempotencyKey,
      })
      return { id: result.id }
    },
    syncPrintify: async (q, shopifyId) => {
      const printify = tryGetProvider('printify')
      if (
        !printify ||
        !printify.validateConfig().ok ||
        printify.name.includes('unconfigured') ||
        printify.name.includes('stub')
      ) {
        logger.info('printify_sync_skipped', { shopifyId })
        return { id: `printify-pending:${shopifyId}` }
      }
      if (!env.PRINTIFY_BLUEPRINT_ID || !env.PRINTIFY_PRINT_PROVIDER_ID) {
        logger.info('printify_sync_skipped_missing_blueprint', { shopifyId })
        return { id: `printify-pending:${shopifyId}` }
      }
      const imageUrl = toAbsoluteMediaUrl(q.payload.mediaUrls[0] || '')
      if (!imageUrl.startsWith('http')) {
        return { id: `printify-pending-no-public-media:${shopifyId}` }
      }
      const created = await printify.createProduct({
        title: q.payload.title,
        description: q.payload.description,
        imageUrl,
        imageFileName: 'design.png',
        blueprintId: env.PRINTIFY_BLUEPRINT_ID,
        printProviderId: env.PRINTIFY_PRINT_PROVIDER_ID,
        tags: q.payload.tags,
        idempotencyKey: `printify:${q.idempotencyKey}`,
        variants: [
          {
            id: 1,
            sku: q.payload.variantSkus[0] || 'TEE-M',
            priceCents: q.payload.priceCents,
            isEnabled: true,
          },
        ],
      })
      return { id: created.id }
    },
  })

  logger.info('shopify_draft_from_approval', {
    id: processed.id,
    status: processed.status,
    shopifyTag: processed.payload.tags.find((t) => t.startsWith('shopify:')),
  })

  if (processed.status === 'PUBLISHED') {
    await upsertProductFromDraft(processed)
  }

  return processed
}

async function upsertProductFromDraft(item: PublishingQueueItem): Promise<void> {
  const { isMongoConfigured, connectMongo } = await import('@/lib/db')
  if (!isMongoConfigured()) return
  const { Product } = await import('@/models/Product')
  await connectMongo()

  const shopifyId =
    item.payload.tags.find((t) => t.startsWith('shopify:'))?.replace('shopify:', '') || null
  const printifyRaw =
    item.payload.tags.find((t) => t.startsWith('printify:'))?.replace('printify:', '') || null
  const printifyId = printifyRaw && !printifyRaw.startsWith('printify-pending') ? printifyRaw : null

  const storeId = item.payload.storeId
  const brandId = item.payload.brandId
  const ideaId = item.payload.ideaId
  const designId = item.payload.designId
  if (!storeId || !brandId || !ideaId || !designId) {
    logger.warn('product_upsert_skipped_missing_refs', { key: item.idempotencyKey })
    return
  }

  await Product.findOneAndUpdate(
    { designId },
    {
      storeId,
      brandId,
      ideaId,
      designId,
      title: item.payload.title,
      description: item.payload.description,
      niche: item.payload.niche || 'gaming',
      status: 'shopify_draft',
      shopifyProductId: shopifyId,
      printifyProductId: printifyId,
      tags: item.payload.tags,
      provenance: {
        sourceTrendIds: [],
        ideaId,
        promptVersion: 'listing-v1',
        modelProvider: 'publishing',
        modelName: 'draft-from-approval',
        imageAssetKey: item.payload.mediaUrls[0] || null,
        qualityScore: item.payload.qualityScore,
        safetyScore: 100,
        safetyDecision: 'PASS',
        publishStatus: 'shopify_draft',
      },
    },
    { upsert: true, new: true }
  )

  logger.info('product_upserted_from_draft', {
    title: item.payload.title,
    shopifyId,
  })
}

export function getPublishingQueueSnapshot() {
  return listPublishingQueue().map((item) => ({
    id: item.id,
    idempotencyKey: item.idempotencyKey,
    status: item.status,
    title: item.payload.title,
    validationErrors: item.validationErrors,
    attempts: item.attempts,
    lastError: item.lastError,
    createdAt: item.createdAt,
    tags: item.payload.tags,
  }))
}

export async function getPublishingQueueSnapshotAsync() {
  await hydratePublishingQueueFromMongo()
  return getPublishingQueueSnapshot()
}
