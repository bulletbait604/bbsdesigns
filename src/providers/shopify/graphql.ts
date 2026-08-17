import { getEnv } from '@/lib/env'
import { ProviderError } from '@/providers/errors'
import { callProvider } from '@/providers/call'
import type {
  ProviderConfigValidation,
  ProviderHealth,
  ShopifyDraftProductInput,
  ShopifyDraftProductResult,
  ShopifyProvider,
} from '@/providers/types'

type GraphQlResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

function shopifyEndpoint(domain: string, apiVersion: string): string {
  const host = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://${host}/admin/api/${apiVersion}/graphql.json`
}

async function shopifyGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: { idempotencyKey?: string }
): Promise<T> {
  const env = getEnv()
  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new ProviderError('Shopify is not configured', {
      provider: 'shopify-graphql',
      kind: 'shopify',
      code: 'PROVIDER_NOT_CONFIGURED',
      statusCode: 503,
      retryable: false,
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  }
  if (opts?.idempotencyKey) {
    headers['Idempotency-Key'] = opts.idempotencyKey
  }

  const response = await fetch(shopifyEndpoint(env.SHOPIFY_STORE_DOMAIN, env.SHOPIFY_API_VERSION), {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new ProviderError(`Shopify HTTP ${response.status}`, {
      provider: 'shopify-graphql',
      kind: 'shopify',
      code: 'SHOPIFY_HTTP_ERROR',
      statusCode: response.status,
      retryable: response.status >= 500 || response.status === 429,
      details: await response.text().catch(() => ''),
    })
  }

  const json = (await response.json()) as GraphQlResponse<T>
  if (json.errors?.length) {
    throw new ProviderError(json.errors.map((e) => e.message).join('; '), {
      provider: 'shopify-graphql',
      kind: 'shopify',
      code: 'SHOPIFY_GRAPHQL_ERROR',
      retryable: false,
      details: json.errors,
    })
  }
  if (!json.data) {
    throw new ProviderError('Shopify returned empty data', {
      provider: 'shopify-graphql',
      kind: 'shopify',
      code: 'SHOPIFY_EMPTY_DATA',
      retryable: true,
    })
  }
  return json.data
}

const SHOP_HEALTH_QUERY = `#graphql
  query ShopHealth {
    shop {
      name
      myshopifyDomain
      currencyCode
    }
  }
`

const PRODUCT_CREATE_MUTATION = `#graphql
  mutation ProductCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        handle
        status
        variants(first: 10) {
          nodes {
            id
            price
            sku
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

function assertDraftAllowed(input: ShopifyDraftProductInput): void {
  if (input.safetyDecision && input.safetyDecision !== 'PASS') {
    throw new ProviderError(
      `Refusing Shopify draft: safety=${input.safetyDecision}. Only PASS may create drafts.`,
      {
        provider: 'shopify-graphql',
        kind: 'shopify',
        code: 'SAFETY_GATE_BLOCKED',
        statusCode: 403,
        retryable: false,
      }
    )
  }

  // Never allow ACTIVE through this adapter during development defaults
  if (input.status === 'ACTIVE') {
    throw new ProviderError('ACTIVE publish is disabled in the Shopify draft adapter', {
      provider: 'shopify-graphql',
      kind: 'shopify',
      code: 'PUBLISH_DISABLED',
      statusCode: 403,
      retryable: false,
    })
  }

  const req = input.requirements
  if (req) {
    if (req.hasMedia === false) {
      throw new ProviderError('Draft blocked: media required', {
        provider: 'shopify-graphql',
        kind: 'shopify',
        code: 'REQUIREMENT_MEDIA',
        statusCode: 400,
        retryable: false,
      })
    }
    if (req.hasValidPrice === false) {
      throw new ProviderError('Draft blocked: valid price required', {
        provider: 'shopify-graphql',
        kind: 'shopify',
        code: 'REQUIREMENT_PRICE',
        statusCode: 400,
        retryable: false,
      })
    }
    if (req.hasVariants === false) {
      throw new ProviderError('Draft blocked: variants required', {
        provider: 'shopify-graphql',
        kind: 'shopify',
        code: 'REQUIREMENT_VARIANTS',
        statusCode: 400,
        retryable: false,
      })
    }
  }
}

export function createShopifyGraphqlProvider(name = 'shopify-graphql'): ShopifyProvider {
  return {
    kind: 'shopify',
    name,
    validateConfig(): ProviderConfigValidation {
      const env = getEnv()
      const missing: string[] = []
      if (!env.SHOPIFY_STORE_DOMAIN) missing.push('SHOPIFY_STORE_DOMAIN')
      if (!env.SHOPIFY_ADMIN_ACCESS_TOKEN) missing.push('SHOPIFY_ADMIN_ACCESS_TOKEN')
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
          kind: 'shopify',
          message: config.message,
          checkedAt: new Date().toISOString(),
        }
      }
      try {
        const data = await callProvider(
          () => shopifyGraphql<{ shop: { name: string; myshopifyDomain: string } }>(SHOP_HEALTH_QUERY),
          {
            provider: name,
            kind: 'shopify',
            label: 'shopify.health',
            retries: 1,
            timeoutMs: 15_000,
          }
        )
        return {
          ok: true,
          provider: name,
          kind: 'shopify',
          message: `Connected to ${data.shop.name} (${data.shop.myshopifyDomain})`,
          checkedAt: new Date().toISOString(),
        }
      } catch (error) {
        return {
          ok: false,
          provider: name,
          kind: 'shopify',
          message: error instanceof Error ? error.message : String(error),
          checkedAt: new Date().toISOString(),
        }
      }
    },
    async createDraftProduct(input: ShopifyDraftProductInput): Promise<ShopifyDraftProductResult> {
      assertDraftAllowed(input)

      const product: Record<string, unknown> = {
        title: input.title,
        descriptionHtml: input.descriptionHtml || '',
        vendor: input.vendor || 'bbsdesigns',
        productType: input.productType || 'Apparel',
        tags: input.tags || [],
        status: 'DRAFT',
      }

      if (input.seoTitle || input.seoDescription) {
        product.seo = {
          title: input.seoTitle || input.title,
          description: input.seoDescription || '',
        }
      }

      if (input.collectionIds?.length) {
        product.collectionsToJoin = input.collectionIds
      }

      const media =
        input.media?.map((m) => ({
          originalSource: m.originalSource,
          alt: m.alt || input.title,
          mediaContentType: 'IMAGE',
        })) || undefined

      const data = await callProvider(
        () =>
          shopifyGraphql<{
            productCreate: {
              product: {
                id: string
                handle: string
                status: string
                variants: { nodes: Array<{ id: string }> }
              } | null
              userErrors: Array<{ field?: string[] | null; message: string }>
            }
          }>(
            PRODUCT_CREATE_MUTATION,
            { product, media },
            { idempotencyKey: input.idempotencyKey }
          ),
        {
          provider: name,
          kind: 'shopify',
          label: 'shopify.productCreate',
          retries: 2,
          timeoutMs: 30_000,
        }
      )

      const payload = data.productCreate
      if (payload.userErrors?.length) {
        throw new ProviderError(payload.userErrors.map((e) => e.message).join('; '), {
          provider: name,
          kind: 'shopify',
          code: 'SHOPIFY_USER_ERRORS',
          retryable: false,
          details: payload.userErrors,
        })
      }
      if (!payload.product) {
        throw new ProviderError('Shopify productCreate returned no product', {
          provider: name,
          kind: 'shopify',
          code: 'SHOPIFY_NO_PRODUCT',
          retryable: true,
        })
      }

      return {
        id: payload.product.id,
        handle: payload.product.handle,
        status: 'shopify_draft',
        variantIds: payload.product.variants.nodes.map((v) => v.id),
        userErrors: [],
      }
    },
  }
}
