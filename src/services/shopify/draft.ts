import { createHash } from 'crypto'
import { getProvider } from '@/providers/registry'
import { ProviderError } from '@/providers/errors'
import type { ShopifyDraftProductInput, ShopifyDraftProductResult } from '@/providers/types'
import { logger } from '@/lib/logger'

export type CreateShopifyDraftArgs = {
  title: string
  descriptionHtml: string
  tags: string[]
  vendor?: string
  productType?: string
  seoTitle?: string
  seoDescription?: string
  collectionIds?: string[]
  media?: Array<{ originalSource: string; alt?: string }>
  price: string
  sku?: string
  safetyDecision: 'PASS' | 'REVIEW' | 'REJECT'
  idempotencyKey?: string
}

function buildIdempotencyKey(args: CreateShopifyDraftArgs): string {
  if (args.idempotencyKey) return args.idempotencyKey
  return createHash('sha256')
    .update(`${args.title}|${args.sku || ''}|${args.media?.[0]?.originalSource || ''}`)
    .digest('hex')
    .slice(0, 32)
}

/**
 * High-level Shopify draft creation with safety + requirement gates.
 * Always creates DRAFT. Never uses REST product creation.
 */
export async function createShopifyProductDraft(
  args: CreateShopifyDraftArgs
): Promise<ShopifyDraftProductResult> {
  if (args.safetyDecision !== 'PASS') {
    throw new ProviderError(
      `Cannot create Shopify draft unless safety=PASS (got ${args.safetyDecision})`,
      {
        provider: 'shopify-service',
        kind: 'shopify',
        code: 'SAFETY_GATE_BLOCKED',
        statusCode: 403,
        retryable: false,
      }
    )
  }

  const priceNum = Number(args.price)
  const hasValidPrice = Number.isFinite(priceNum) && priceNum > 0
  const hasMedia = Boolean(args.media?.length)
  const hasVariants = true

  const input: ShopifyDraftProductInput = {
    title: args.title,
    descriptionHtml: args.descriptionHtml,
    tags: args.tags,
    vendor: args.vendor,
    productType: args.productType,
    seoTitle: args.seoTitle,
    seoDescription: args.seoDescription,
    collectionIds: args.collectionIds,
    media: args.media,
    status: 'DRAFT',
    safetyDecision: args.safetyDecision,
    idempotencyKey: buildIdempotencyKey(args),
    variants: [
      {
        price: args.price,
        sku: args.sku,
      },
    ],
    requirements: {
      hasMedia,
      hasValidPrice,
      hasVariants,
    },
  }

  const shopify = getProvider('shopify')
  const result = await shopify.createDraftProduct(input)

  logger.info('shopify_draft_created', {
    id: result.id,
    handle: result.handle,
    idempotencyKey: input.idempotencyKey,
  })

  return result
}
