import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import {
  createGoogleImageProvider,
  normalizeImageModelId,
} from '@/providers/image/google'
import { ProviderError } from '@/providers/errors'

describe('google image provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetEnvCache()
    delete process.env.IMAGE_API_KEY
    delete process.env.IMAGE_PROVIDER
    delete process.env.IMAGE_MODEL
  })

  it('requires api key', () => {
    resetEnvCache()
    const provider = createGoogleImageProvider()
    expect(provider.validateConfig().ok).toBe(false)
  })

  it('normalizes models/ prefix', () => {
    expect(normalizeImageModelId('models/gemini-3.1-flash-image')).toBe('gemini-3.1-flash-image')
  })

  it('decodes inline image bytes from Gemini response', async () => {
    process.env.IMAGE_API_KEY = 'test-key'
    resetEnvCache()

    const png = Buffer.from('fakepng')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: png.toString('base64'),
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 }
        )
      )
    )

    const provider = createGoogleImageProvider()
    const result = await provider.generate({
      prompt: 'flashy merch art',
      width: 1024,
      height: 1024,
    })
    expect(result.provider).toBe('google-gemini-image')
    expect(result.model).toBe('gemini-3.1-flash-image')
    expect(result.mimeType).toBe('image/png')
    expect(result.bytes.equals(png)).toBe(true)
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit)?.body || '{}'))
    expect(body.generationConfig.imageConfig.aspectRatio).toBe('1:1')
    expect(body.generationConfig.imageConfig.imageSize).toBe('2K')
  })

  it('falls back when primary model returns not-found 400', async () => {
    process.env.IMAGE_API_KEY = 'test-key'
    process.env.IMAGE_MODEL = 'gemini-2.5-flash-image'
    resetEnvCache()

    const png = Buffer.from('fallback-png')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('gemini-2.5-flash-image')) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'models/gemini-2.5-flash-image is not found for API version v1beta',
              status: 'NOT_FOUND',
            },
          }),
          { status: 400 }
        )
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: png.toString('base64'),
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = createGoogleImageProvider()
    const result = await provider.generate({ prompt: 'merch art' })
    expect(result.model).toBe('gemini-3.1-flash-image')
    expect(result.bytes.equals(png)).toBe(true)
  })

  it('surfaces Google error message on hard failure', async () => {
    process.env.IMAGE_API_KEY = 'test-key'
    process.env.IMAGE_MODEL = 'gemini-3.1-flash-image'
    resetEnvCache()

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' },
          }),
          { status: 400 }
        )
      )
    )

    const provider = createGoogleImageProvider()
    await expect(provider.generate({ prompt: 'x' })).rejects.toMatchObject({
      message: expect.stringContaining('API key not valid'),
    } satisfies Partial<ProviderError>)
  })
})
