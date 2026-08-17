import { ProviderError } from '@/providers/errors'
import type {
  AiTextProvider,
  AnyProvider,
  ImageProvider,
  PodProvider,
  ProviderKind,
  ShopifyProvider,
  StorageProvider,
  TrendProvider,
} from '@/providers/types'

type ProviderMap = {
  ai_text?: AiTextProvider
  image?: ImageProvider
  trend?: TrendProvider
  storage?: StorageProvider
  shopify?: ShopifyProvider
  printify?: PodProvider
}

const registry: ProviderMap = {}

export function registerProvider<K extends ProviderKind>(
  kind: K,
  provider: NonNullable<ProviderMap[K]>
): void {
  if (provider.kind !== kind) {
    throw new ProviderError(`Provider kind mismatch: expected ${kind}, got ${provider.kind}`, {
      provider: provider.name,
      kind,
      code: 'PROVIDER_KIND_MISMATCH',
      statusCode: 500,
    })
  }
  registry[kind] = provider as ProviderMap[K]
}

export function getProvider<K extends ProviderKind>(kind: K): NonNullable<ProviderMap[K]> {
  const provider = registry[kind]
  if (!provider) {
    throw new ProviderError(`No provider registered for ${kind}`, {
      provider: 'registry',
      kind,
      code: 'PROVIDER_NOT_REGISTERED',
      statusCode: 500,
    })
  }
  return provider as NonNullable<ProviderMap[K]>
}

export function tryGetProvider<K extends ProviderKind>(kind: K): ProviderMap[K] | undefined {
  return registry[kind]
}

export function listProviders(): AnyProvider[] {
  return Object.values(registry).filter(Boolean) as AnyProvider[]
}

export function clearProviders(): void {
  ;(Object.keys(registry) as ProviderKind[]).forEach((key) => {
    delete registry[key]
  })
}

export async function healthCheckAll() {
  const providers = listProviders()
  return Promise.all(providers.map((p) => p.healthCheck()))
}
