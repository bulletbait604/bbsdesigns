import { getEnv } from '@/lib/env'
import {
  createStubAiTextProvider,
  createStubImageProvider,
  createStubPodProvider,
  createStubStorageProvider,
  createStubTrendProvider,
  createUnconfiguredShopifyProvider,
  createStubShopifyProvider,
} from '@/providers/stubs'
import { clearProviders, registerProvider } from '@/providers/registry'

/**
 * Boots the provider registry with stub adapters.
 * Real vendor adapters replace these in later prompts when keys exist.
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
    shopifyReady ? createStubShopifyProvider() : createUnconfiguredShopifyProvider()
  )
}
