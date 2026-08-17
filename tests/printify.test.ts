import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPrintifyProvider } from '@/providers/printify/api'
import { clearProviders, registerProvider } from '@/providers/registry'
import { resetEnvCache } from '@/lib/env'
import { createStubPodProvider } from '@/providers/stubs'

describe('printify provider', () => {
  afterEach(() => {
    clearProviders()
    resetEnvCache()
    vi.unstubAllGlobals()
    delete process.env.PRINTIFY_API_TOKEN
    delete process.env.PRINTIFY_SHOP_ID
    delete process.env.PRINTIFY_BLUEPRINT_ID
    delete process.env.PRINTIFY_PRINT_PROVIDER_ID
  })

  it('lists shops and creates products with upload + mapping (mocked)', async () => {
    process.env.PRINTIFY_API_TOKEN = 'token'
    process.env.PRINTIFY_SHOP_ID = '99'
    process.env.PRINTIFY_BLUEPRINT_ID = '5'
    process.env.PRINTIFY_PRINT_PROVIDER_ID = '7'
    resetEnvCache()

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 99, title: 'Main Shop' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'img-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, visible: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 55,
          status: 'pending',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 55,
          status: 'shipped',
          shipments: [{ tracking_number: '1Z999', tracking_url: 'https://track.example/1Z999' }],
        }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const provider = createPrintifyProvider()
    registerProvider('printify', provider)

    const shops = await provider.listShops()
    expect(shops[0].id).toBe('99')

    const product = await provider.createProduct({
      title: 'Lag Tee',
      description: 'funny gaming tee',
      imageUrl: 'https://cdn.example.com/lag.png',
      variants: [{ id: 401, priceCents: 2999, sku: 'LAG-S' }],
      tags: ['gaming'],
      idempotencyKey: 'printify-test-1',
    })
    expect(product.id).toBe('123')
    expect(product.externalStatus).toBe('draft')

    const order = await provider.createOrder({
      externalId: 'ext-1',
      lineItems: [{ productId: '123', variantId: 401, quantity: 1 }],
      addressTo: {
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.com',
        country: 'US',
        address1: '1 Main',
        city: 'Austin',
        zip: '78701',
      },
      idempotencyKey: 'order-1',
    })
    expect(order.fulfilledConfirmed).toBe(false)

    const status = await provider.getOrderStatus('99', '55')
    expect(status.fulfilledConfirmed).toBe(true)
    expect(status.trackingNumber).toBe('1Z999')
  })

  it('stub never claims fulfillment without confirmation', async () => {
    const stub = createStubPodProvider()
    const order = await stub.createOrder({
      externalId: 'x',
      lineItems: [{ productId: '1', variantId: 1, quantity: 1 }],
      addressTo: {
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.com',
        country: 'US',
        address1: '1 Main',
        city: 'Austin',
        zip: '78701',
      },
    })
    expect(order.fulfilledConfirmed).toBe(false)
  })
})
