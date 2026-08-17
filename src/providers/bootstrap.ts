import { getEnv } from '@/lib/env'
import {
  createStubAiTextProvider,
  createStubImageProvider,
  createStubStorageProvider,
  createStubTrendProvider,
  createStubPodProvider,
  createUnconfiguredShopifyProvider,
} from '@/providers/stubs'
import { createShopifyGraphqlProvider } from '@/providers/shopify/graphql'
import {
  createPrintifyProvider,
  createUnconfiguredPrintifyProvider,
} from '@/providers/printify/api'
import { clearProviders, registerProvider } from '@/providers/registry'

/**
 * Boots the provider registry.
 * Real Shopify/Printify adapters replace stubs when credentials exist.
 */
export function bootstrapProviders(): void {
  clearProviders()
  const env = getEnv()

  registerProvider('ai_text', createStubAiTextProvider())
  registerProvider('image', createStubImageProvider())
  registerProvider('trend', createStubTrendProvider())
  registerProvider('storage', createStubStorageProvider())

  const shopifyReady = Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN)
  registerProvider(
    'shopify',
    shopifyReady ? createShopifyGraphqlProvider() : createUnconfiguredShopifyProvider()
  )

  const printifyReady = Boolean(env.PRINTIFY_API_TOKEN)
  registerProvider(
    'printify',
    printifyReady
      ? // Prefer real API; fall back to stub methods only when token missing.
        createPrintifyProvider()
      : createUnconfiguredPrintifyProvider()
  )

  // Keep a stub available for local offline product mapping tests via env override
  if (process.env.PRINTIFY_USE_STUB === 'true') {
    registerProvider('printify', createStubPodProvider())
  }
}
