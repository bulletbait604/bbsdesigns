import { ProviderError } from '@/providers/errors'
import type {
  AiTextProvider,
  ImageProvider,
  PodProvider,
  ProviderConfigValidation,
  ProviderHealth,
  ShopifyProvider,
  StorageProvider,
  TrendProvider,
} from '@/providers/types'

function health(kind: ProviderHealth['kind'], provider: string, ok: boolean, message?: string): ProviderHealth {
  return {
    ok,
    provider,
    kind,
    message,
    checkedAt: new Date().toISOString(),
  }
}

function missingConfig(keys: string[]): ProviderConfigValidation {
  return {
    ok: keys.length === 0,
    missing: keys,
    message: keys.length ? `Missing config: ${keys.join(', ')}` : undefined,
  }
}

/** Deterministic stubs for tests and local boot without vendor keys. */
export function createStubAiTextProvider(name = 'stub-ai-text'): AiTextProvider {
  return {
    kind: 'ai_text',
    name,
    validateConfig: () => missingConfig([]),
    healthCheck: async () => health('ai_text', name, true, 'stub ready'),
    complete: async (request) => ({
      text: `[stub] ${request.prompt.slice(0, 120)}`,
      model: 'stub',
      provider: name,
    }),
  }
}

export function createStubImageProvider(name = 'stub-image'): ImageProvider {
  return {
    kind: 'image',
    name,
    validateConfig: () => missingConfig([]),
    healthCheck: async () => health('image', name, true, 'stub ready'),
    generate: async () => ({
      bytes: Buffer.from('stub-image'),
      mimeType: 'image/png',
      model: 'stub',
      provider: name,
      width: 1024,
      height: 1024,
    }),
  }
}

export function createStubTrendProvider(name = 'stub-trend'): TrendProvider {
  return {
    kind: 'trend',
    name,
    validateConfig: () => missingConfig([]),
    healthCheck: async () => health('trend', name, true, 'stub ready'),
    fetchSignals: async ({ niche, limit = 3 }) =>
      Array.from({ length: limit }, (_, i) => ({
        externalId: `${niche}-stub-${i + 1}`,
        title: `${niche} humor signal ${i + 1}`,
        summary: 'Stub trend signal for local development',
        keywords: [niche, 'humor'],
        scoreHint: 50 + i,
      })),
  }
}

export function createStubStorageProvider(name = 'stub-storage'): StorageProvider {
  return {
    kind: 'storage',
    name,
    validateConfig: () => missingConfig([]),
    healthCheck: async () => health('storage', name, true, 'stub ready'),
    putObject: async ({ key }) => ({
      key,
      url: `https://example.invalid/${key}`,
    }),
    getPublicUrl: (key) => `https://example.invalid/${key}`,
  }
}

export function createStubShopifyProvider(name = 'stub-shopify'): ShopifyProvider {
  return {
    kind: 'shopify',
    name,
    validateConfig: () => missingConfig([]),
    healthCheck: async () => health('shopify', name, true, 'stub ready'),
    createDraftProduct: async (input) => ({
      id: `gid://shopify/Product/stub-${Buffer.from(input.title).toString('hex').slice(0, 8)}`,
      handle: input.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40),
      status: 'shopify_draft',
    }),
  }
}

export function createStubPodProvider(name = 'stub-printify'): PodProvider {
  return {
    kind: 'printify',
    name,
    validateConfig: () => missingConfig([]),
    healthCheck: async () => health('printify', name, true, 'stub ready'),
    listShops: async () => [{ id: 'shop-1', title: 'Stub Shop' }],
    listBlueprints: async () => [{ id: 5, title: 'Stub Unisex Tee' }],
    createProduct: async (input) => ({
      id: `printify-stub-${Buffer.from(input.title).toString('hex').slice(0, 8)}`,
      externalStatus: 'draft',
      shopId: input.shopId || 'shop-1',
    }),
    createOrder: async (input) => ({
      id: `order-stub-${input.externalId}`,
      status: 'pending',
      fulfilledConfirmed: false,
    }),
    getOrderStatus: async (_shopId, orderId) => ({
      id: orderId,
      status: 'pending',
      fulfilledConfirmed: false,
      trackingNumber: null,
      trackingUrl: null,
    }),
  }
}

export function createUnconfiguredShopifyProvider(name = 'shopify-unconfigured'): ShopifyProvider {
  return {
    kind: 'shopify',
    name,
    validateConfig: () => missingConfig(['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN']),
    healthCheck: async () => {
      const config = missingConfig(['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN'])
      return health('shopify', name, false, config.message)
    },
    createDraftProduct: async () => {
      throw new ProviderError('Shopify is not configured', {
        provider: name,
        kind: 'shopify',
        code: 'PROVIDER_NOT_CONFIGURED',
        statusCode: 503,
        retryable: false,
      })
    },
  }
}
