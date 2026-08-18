import { getEnv } from '@/lib/env'
import {
  createStubAiTextProvider,
  createStubImageProvider,
  createStubStorageProvider,
  createStubPodProvider,
  createUnconfiguredShopifyProvider,
} from '@/providers/stubs'
import { createShopifyGraphqlProvider } from '@/providers/shopify/graphql'
import {
  createPrintifyProvider,
  createUnconfiguredPrintifyProvider,
} from '@/providers/printify/api'
import { createConfiguredTrendProvider } from '@/providers/trend'
import { createGoogleImageProvider } from '@/providers/image/google'
import { clearProviders, registerProvider } from '@/providers/registry'

/**
 * Boots the provider registry.
 * Real Shopify/Printify/trend/image adapters replace stubs when credentials exist.
 */
export function bootstrapProviders(): void {
  clearProviders()
  const env = getEnv()

  registerProvider('ai_text', createStubAiTextProvider())

  const imageProviderName = (env.IMAGE_PROVIDER || '').trim().toLowerCase()
  const googleImageReady =
    (imageProviderName === 'google' || imageProviderName === 'gemini') &&
    Boolean(env.IMAGE_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
  registerProvider(
    'image',
    googleImageReady ? createGoogleImageProvider() : createStubImageProvider()
  )

  registerProvider('trend', createConfiguredTrendProvider())
  registerProvider('storage', createStubStorageProvider())

  const shopifyReady = Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN)
  registerProvider(
    'shopify',
    shopifyReady ? createShopifyGraphqlProvider() : createUnconfiguredShopifyProvider()
  )

  const printifyReady = Boolean(env.PRINTIFY_API_TOKEN)
  registerProvider(
    'printify',
    printifyReady ? createPrintifyProvider() : createUnconfiguredPrintifyProvider()
  )

  if (process.env.PRINTIFY_USE_STUB === 'true') {
    registerProvider('printify', createStubPodProvider())
  }
}
