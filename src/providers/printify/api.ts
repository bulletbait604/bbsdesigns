import { getEnv } from '@/lib/env'
import { ProviderError } from '@/providers/errors'
import { callProvider } from '@/providers/call'
import type {
  PodBlueprint,
  PodOrderInput,
  PodOrderResult,
  PodProductInput,
  PodProductResult,
  PodProvider,
  PodShop,
  ProviderConfigValidation,
  ProviderHealth,
} from '@/providers/types'

const BASE_URL = 'https://api.printify.com/v1'

async function printifyFetch<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const env = getEnv()
  if (!env.PRINTIFY_API_TOKEN) {
    throw new ProviderError('Printify is not configured', {
      provider: 'printify-api',
      kind: 'printify',
      code: 'PROVIDER_NOT_CONFIGURED',
      statusCode: 503,
      retryable: false,
    })
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'bbsdesigns-ai-merch-factory/0.1',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.idempotencyKey) {
    headers['Idempotency-Key'] = init.idempotencyKey
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new ProviderError(`Printify HTTP ${response.status}: ${body.slice(0, 300)}`, {
      provider: 'printify-api',
      kind: 'printify',
      code: 'PRINTIFY_HTTP_ERROR',
      statusCode: response.status,
      retryable: response.status >= 500 || response.status === 429,
      details: body,
    })
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function resolveShopId(explicit?: string): string {
  const env = getEnv()
  const shopId = explicit || env.PRINTIFY_SHOP_ID
  if (!shopId) {
    throw new ProviderError('Printify shop id required (PRINTIFY_SHOP_ID or input.shopId)', {
      provider: 'printify-api',
      kind: 'printify',
      code: 'PRINTIFY_SHOP_REQUIRED',
      statusCode: 400,
      retryable: false,
    })
  }
  return shopId
}

function mapOrderStatus(raw: {
  id?: string | number
  status?: string
  shipments?: Array<{ tracking_number?: string; tracking_url?: string }>
}): PodOrderResult {
  const status = (raw.status || 'unknown').toLowerCase()
  const fulfilledConfirmed =
    status === 'fulfilled' ||
    status === 'shipped' ||
    status === 'delivered' ||
    Boolean(raw.shipments?.some((s) => s.tracking_number))

  return {
    id: String(raw.id ?? ''),
    status,
    fulfilledConfirmed,
    trackingNumber: raw.shipments?.[0]?.tracking_number ?? null,
    trackingUrl: raw.shipments?.[0]?.tracking_url ?? null,
  }
}

export function createPrintifyProvider(name = 'printify-api'): PodProvider {
  return {
    kind: 'printify',
    name,
    validateConfig(): ProviderConfigValidation {
      const env = getEnv()
      const missing: string[] = []
      if (!env.PRINTIFY_API_TOKEN) missing.push('PRINTIFY_API_TOKEN')
      return {
        ok: missing.length === 0,
        missing,
        message: missing.length ? `Missing config: ${missing.join(', ')}` : undefined,
      }
    },
    async healthCheck(): Promise<ProviderHealth> {
      const config = this.validateConfig()
      if (!config.ok) {
        return {
          ok: false,
          provider: name,
          kind: 'printify',
          message: config.message,
          checkedAt: new Date().toISOString(),
        }
      }
      try {
        const data = await callProvider(
          () => printifyFetch<Array<{ id: number | string; title: string }>>('/shops.json'),
          {
            provider: name,
            kind: 'printify',
            label: 'printify.health',
            retries: 1,
            timeoutMs: 15_000,
          }
        )
        return {
          ok: true,
          provider: name,
          kind: 'printify',
          message: `Connected — ${data.length} shop(s)`,
          checkedAt: new Date().toISOString(),
        }
      } catch (error) {
        return {
          ok: false,
          provider: name,
          kind: 'printify',
          message: error instanceof Error ? error.message : String(error),
          checkedAt: new Date().toISOString(),
        }
      }
    },
    async listShops(): Promise<PodShop[]> {
      const data = await callProvider(
        () => printifyFetch<Array<{ id: number | string; title: string }>>('/shops.json'),
        {
          provider: name,
          kind: 'printify',
          label: 'printify.listShops',
          retries: 1,
          timeoutMs: 15_000,
        }
      )
      return data.map((s) => ({ id: String(s.id), title: s.title }))
    },
    async listBlueprints(limit = 25): Promise<PodBlueprint[]> {
      const data = await callProvider(
        () =>
          printifyFetch<Array<{ id: number; title: string }>>(`/catalog/blueprints.json`),
        {
          provider: name,
          kind: 'printify',
          label: 'printify.listBlueprints',
          retries: 1,
          timeoutMs: 20_000,
        }
      )
      return data.slice(0, limit).map((b) => ({ id: b.id, title: b.title }))
    },
    async createProduct(input: PodProductInput): Promise<PodProductResult> {
      const env = getEnv()
      const shopId = resolveShopId(input.shopId)
      const blueprintId = Number(input.blueprintId || env.PRINTIFY_BLUEPRINT_ID)
      const printProviderId = Number(input.printProviderId || env.PRINTIFY_PRINT_PROVIDER_ID)

      if (!blueprintId || !printProviderId) {
        throw new ProviderError(
          'Printify blueprintId and printProviderId are required (env or input)',
          {
            provider: name,
            kind: 'printify',
            code: 'PRINTIFY_TEMPLATE_REQUIRED',
            statusCode: 400,
            retryable: false,
          }
        )
      }

      const upload = await callProvider(
        () =>
          printifyFetch<{ id: string }>('/uploads/images.json', {
            method: 'POST',
            body: JSON.stringify({
              file_name: input.imageFileName || `${input.title.slice(0, 40)}.png`,
              url: input.imageUrl,
            }),
            idempotencyKey: input.idempotencyKey
              ? `${input.idempotencyKey}:upload`
              : undefined,
          }),
        {
          provider: name,
          kind: 'printify',
          label: 'printify.uploadImage',
          retries: 2,
          timeoutMs: 30_000,
        }
      )

      const variants =
        input.variants?.map((v) => ({
          id: v.id,
          price: v.priceCents,
          is_enabled: v.isEnabled ?? true,
          sku: v.sku,
        })) || [{ id: 1, price: 2999, is_enabled: true }]

      const product = await callProvider(
        () =>
          printifyFetch<{ id: number | string; visible?: boolean }>(
            `/shops/${shopId}/products.json`,
            {
              method: 'POST',
              body: JSON.stringify({
                title: input.title,
                description: input.description || '',
                blueprint_id: blueprintId,
                print_provider_id: printProviderId,
                variants,
                print_areas: [
                  {
                    variant_ids: variants.map((v) => v.id),
                    placeholders: [
                      {
                        position: 'front',
                        images: [
                          {
                            id: upload.id,
                            x: 0.5,
                            y: 0.5,
                            scale: 1,
                            angle: 0,
                          },
                        ],
                      },
                    ],
                  },
                ],
                tags: input.tags || [],
              }),
              idempotencyKey: input.idempotencyKey,
            }
          ),
        {
          provider: name,
          kind: 'printify',
          label: 'printify.createProduct',
          retries: 2,
          timeoutMs: 45_000,
        }
      )

      return {
        id: String(product.id),
        externalStatus: 'draft',
        shopId,
      }
    },
    async createOrder(input: PodOrderInput): Promise<PodOrderResult> {
      const shopId = resolveShopId(input.shopId)
      const created = await callProvider(
        () =>
          printifyFetch<{ id: number | string; status?: string }>(
            `/shops/${shopId}/orders.json`,
            {
              method: 'POST',
              body: JSON.stringify({
                external_id: input.externalId,
                line_items: input.lineItems.map((li) => ({
                  product_id: li.productId,
                  variant_id: li.variantId,
                  quantity: li.quantity,
                })),
                shipping_method: input.shippingMethod ?? 1,
                address_to: {
                  first_name: input.addressTo.firstName,
                  last_name: input.addressTo.lastName,
                  email: input.addressTo.email,
                  phone: input.addressTo.phone || '',
                  country: input.addressTo.country,
                  region: input.addressTo.region || '',
                  address1: input.addressTo.address1,
                  address2: input.addressTo.address2 || '',
                  city: input.addressTo.city,
                  zip: input.addressTo.zip,
                },
              }),
              idempotencyKey: input.idempotencyKey,
            }
          ),
        {
          provider: name,
          kind: 'printify',
          label: 'printify.createOrder',
          retries: 2,
          timeoutMs: 30_000,
        }
      )

      // Never claim fulfilled on create — confirm via status endpoint.
      return {
        id: String(created.id),
        status: (created.status || 'pending').toLowerCase(),
        fulfilledConfirmed: false,
      }
    },
    async getOrderStatus(shopId: string, orderId: string): Promise<PodOrderResult> {
      const raw = await callProvider(
        () =>
          printifyFetch<{
            id: number | string
            status?: string
            shipments?: Array<{ tracking_number?: string; tracking_url?: string }>
          }>(`/shops/${shopId}/orders/${orderId}.json`),
        {
          provider: name,
          kind: 'printify',
          label: 'printify.getOrderStatus',
          retries: 1,
          timeoutMs: 15_000,
        }
      )
      return mapOrderStatus(raw)
    },
  }
}

export function createUnconfiguredPrintifyProvider(name = 'printify-unconfigured'): PodProvider {
  const missing = ['PRINTIFY_API_TOKEN']
  const fail = async () => {
    throw new ProviderError('Printify is not configured', {
      provider: name,
      kind: 'printify',
      code: 'PROVIDER_NOT_CONFIGURED',
      statusCode: 503,
      retryable: false,
    })
  }
  return {
    kind: 'printify',
    name,
    validateConfig: () => ({
      ok: false,
      missing,
      message: `Missing config: ${missing.join(', ')}`,
    }),
    healthCheck: async () => ({
      ok: false,
      provider: name,
      kind: 'printify',
      message: `Missing config: ${missing.join(', ')}`,
      checkedAt: new Date().toISOString(),
    }),
    listShops: fail,
    listBlueprints: fail,
    createProduct: fail,
    createOrder: fail,
    getOrderStatus: fail,
  }
}
