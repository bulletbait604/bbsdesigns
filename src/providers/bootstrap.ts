import { getEnv } from '@/lib/env'
import {
  createStubAiTextProvider,
  createStubImageProvider,
  createStubPodProvider,
  createStubStorageProvider,
  createStubTrendProvider,
  createUnconfiguredShopifyProvider,
} from '@/providers/stubs'
import { createShopifyGraphqlProvider } from '@/providers/shopify/graphql'
import { clearProviders, registerProvider } from '@/providers/registry'

/**
 * Boots the provider registry.
 * Uses real Shopify GraphQL adapter when store domain + token are present.
 */
export function bootstrapProviders(): void {
  clearProviders()
  const env = getEnv()

  registerProvider('ai_text', createStubAiTextProvider())
  registerProvider('image', createStubImageProvider())
  registerProvider('trend', createStubTrendProvider())
  registerProvider('storage', createStubStorageProvider())
  registerProvider('printify', createStubPodProvider())

  const shopifyReady = Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN)
  registerProvider(
    'shopify',
    shopifyReady ? createShopifyGraphqlProvider() : createUnconfiguredShopifyProvider()
  )
}
