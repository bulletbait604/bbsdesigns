import type { Niche, PublishStatus } from '@/types'

export type ProviderKind =
  | 'ai_text'
  | 'image'
  | 'trend'
  | 'storage'
  | 'shopify'
  | 'printify'

export type ProviderHealth = {
  ok: boolean
  provider: string
  kind: ProviderKind
  message?: string
  checkedAt: string
}

export type ProviderConfigValidation = {
  ok: boolean
  missing: string[]
  message?: string
}

/** Common contract every vendor adapter must satisfy. */
export interface BaseProvider {
  readonly kind: ProviderKind
  readonly name: string
  healthCheck(): Promise<ProviderHealth>
  validateConfig(): ProviderConfigValidation
}

export type TextCompletionRequest = {
  prompt: string
  system?: string
  temperature?: number
  maxTokens?: number
}

export type TextCompletionResult = {
  text: string
  model: string
  provider: string
  usage?: { inputTokens?: number; outputTokens?: number }
}

export interface AiTextProvider extends BaseProvider {
  readonly kind: 'ai_text'
  complete(request: TextCompletionRequest): Promise<TextCompletionResult>
}

export type ImageGenerateRequest = {
  prompt: string
  width?: number
  height?: number
  negativePrompt?: string
}

export type ImageGenerateResult = {
  bytes: Buffer
  mimeType: string
  model: string
  provider: string
  width?: number
  height?: number
}

export interface ImageProvider extends BaseProvider {
  readonly kind: 'image'
  generate(request: ImageGenerateRequest): Promise<ImageGenerateResult>
}

export type TrendFetchRequest = {
  niche: Niche
  limit?: number
}

export type TrendSignalDto = {
  externalId: string
  title: string
  summary?: string
  keywords?: string[]
  scoreHint?: number
  observedAt?: string
  raw?: Record<string, unknown>
}

export interface TrendProvider extends BaseProvider {
  readonly kind: 'trend'
  fetchSignals(request: TrendFetchRequest): Promise<TrendSignalDto[]>
}

export type StoragePutRequest = {
  key: string
  body: Buffer
  contentType: string
}

export type StoragePutResult = {
  key: string
  url: string
}

export interface StorageProvider extends BaseProvider {
  readonly kind: 'storage'
  putObject(request: StoragePutRequest): Promise<StoragePutResult>
  getPublicUrl(key: string): string
}

export type ShopifyDraftProductInput = {
  title: string
  descriptionHtml?: string
  tags?: string[]
  /** Always forced to DRAFT by the Shopify adapter unless explicitly overridden after safety PASS. */
  status?: 'DRAFT' | 'ACTIVE'
  vendor?: string
  productType?: string
  seoTitle?: string
  seoDescription?: string
  collectionIds?: string[]
  media?: Array<{ originalSource: string; alt?: string }>
  variants?: Array<{
    price: string
    sku?: string
    optionValues?: Array<{ optionName: string; name: string }>
  }>
  idempotencyKey?: string
  safetyDecision?: 'PASS' | 'REVIEW' | 'REJECT'
  requirements?: {
    hasMedia?: boolean
    hasValidPrice?: boolean
    hasVariants?: boolean
  }
}

export type ShopifyDraftProductResult = {
  id: string
  handle?: string
  status: PublishStatus | 'shopify_draft'
  variantIds?: string[]
  userErrors?: Array<{ field?: string[] | null; message: string }>
}

export interface ShopifyProvider extends BaseProvider {
  readonly kind: 'shopify'
  createDraftProduct(input: ShopifyDraftProductInput): Promise<ShopifyDraftProductResult>
}

export type PodShop = {
  id: string
  title: string
}

export type PodBlueprint = {
  id: number
  title: string
}

export type PodVariantMapping = {
  id: number
  sku?: string
  priceCents: number
  isEnabled?: boolean
}

export type PodProductInput = {
  title: string
  description?: string
  shopId?: string
  blueprintId?: number | string
  printProviderId?: number | string
  imageUrl: string
  imageFileName?: string
  variants?: PodVariantMapping[]
  tags?: string[]
  idempotencyKey?: string
}

export type PodProductResult = {
  id: string
  externalStatus?: string
  shopId?: string
}

export type PodOrderInput = {
  shopId?: string
  externalId: string
  lineItems: Array<{
    productId: string
    variantId: number
    quantity: number
  }>
  shippingMethod?: number
  addressTo: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    country: string
    region?: string
    address1: string
    address2?: string
    city: string
    zip: string
  }
  idempotencyKey?: string
}

export type PodOrderResult = {
  id: string
  status: string
  /** True only when Printify confirms fulfillment/shipment — never assumed. */
  fulfilledConfirmed: boolean
  trackingNumber?: string | null
  trackingUrl?: string | null
}

export interface PodProvider extends BaseProvider {
  readonly kind: 'printify'
  listShops(): Promise<PodShop[]>
  listBlueprints(limit?: number): Promise<PodBlueprint[]>
  createProduct(input: PodProductInput): Promise<PodProductResult>
  createOrder(input: PodOrderInput): Promise<PodOrderResult>
  getOrderStatus(shopId: string, orderId: string): Promise<PodOrderResult>
}

export type AnyProvider =
  | AiTextProvider
  | ImageProvider
  | TrendProvider
  | StorageProvider
  | ShopifyProvider
  | PodProvider
