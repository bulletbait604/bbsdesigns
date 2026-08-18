import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import { createGoogleImageProvider } from '@/providers/image/google'

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
    expect(result.mimeType).toBe('image/png')
    expect(result.bytes.equals(png)).toBe(true)
  })
})
