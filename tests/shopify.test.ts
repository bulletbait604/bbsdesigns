import { afterEach, describe, expect, it, vi } from 'vitest'
import { createShopifyGraphqlProvider } from '@/providers/shopify/graphql'
import { createShopifyProductDraft } from '@/services/shopify/draft'
import { ProviderError } from '@/providers/errors'
import { clearProviders, registerProvider } from '@/providers/registry'
import { resetEnvCache } from '@/lib/env'

describe('shopify graphql adapter', () => {
  afterEach(() => {
    clearProviders()
    resetEnvCache()
    vi.unstubAllGlobals()
    delete process.env.SHOPIFY_STORE_DOMAIN
    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  })

  it('validates configuration and refuses ACTIVE publish', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'demo.myshopify.com'
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'shpat_test'
    resetEnvCache()

    const provider = createShopifyGraphqlProvider()
    expect(provider.validateConfig().ok).toBe(true)

    await expect(
      provider.createDraftProduct({
        title: 'Test',
        status: 'ACTIVE',
        safetyDecision: 'PASS',
        requirements: { hasMedia: true, hasValidPrice: true, hasVariants: true },
      })
    ).rejects.toMatchObject({ code: 'PUBLISH_DISABLED' })
  })

  it('blocks drafts when safety is not PASS', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'demo.myshopify.com'
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'shpat_test'
    resetEnvCache()
    const provider = createShopifyGraphqlProvider()
    registerProvider('shopify', provider)

    await expect(
      createShopifyProductDraft({
        title: 'Lag Tee',
        descriptionHtml: '<p>fun</p>',
        tags: ['gaming'],
        price: '29.00',
        media: [{ originalSource: 'https://example.com/a.png', alt: 'Lag Tee' }],
        safetyDecision: 'REVIEW',
      })
    ).rejects.toBeInstanceOf(ProviderError)
  })

  it('creates DRAFT via GraphQL productCreate (mocked fetch)', async () => {
    process.env.SHOPIFY_STORE_DOMAIN = 'demo.myshopify.com'
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = 'shpat_test'
    resetEnvCache()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            productCreate: {
              product: {
                id: 'gid://shopify/Product/1',
                handle: 'lag-is-a-lifestyle',
                status: 'DRAFT',
                variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1' }] },
              },
              userErrors: [],
            },
          },
        }),
      })
    )

    const provider = createShopifyGraphqlProvider()
    registerProvider('shopify', provider)

    const result = await createShopifyProductDraft({
      title: 'Lag Is A Lifestyle',
      descriptionHtml: '<p>Original gaming humor</p>',
      tags: ['gaming', 'humor'],
      price: '29.00',
      sku: 'LAG-001',
      seoTitle: 'Lag Is A Lifestyle Tee',
      seoDescription: 'Original funny gaming merch',
      media: [{ originalSource: 'https://cdn.example.com/lag.png', alt: 'Lag Is A Lifestyle artwork' }],
      safetyDecision: 'PASS',
      idempotencyKey: 'test-idem-1',
    })

    expect(result.id).toBe('gid://shopify/Product/1')
    expect(result.status).toBe('shopify_draft')
    expect(result.handle).toBe('lag-is-a-lifestyle')

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.query).toContain('productCreate')
    expect(body.variables.product.status).toBe('DRAFT')
    expect(body.variables.media[0].alt).toBe('Lag Is A Lifestyle artwork')
  })
})
