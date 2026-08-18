import { getEnv } from '@/lib/env'
import { ProviderError } from '@/providers/errors'
import type {
  ImageGenerateRequest,
  ImageGenerateResult,
  ImageProvider,
  ProviderConfigValidation,
  ProviderHealth,
} from '@/providers/types'

const DEFAULT_MODEL = 'gemini-2.5-flash-image'

function health(provider: string, ok: boolean, message?: string): ProviderHealth {
  return {
    ok,
    provider,
    kind: 'image',
    message,
    checkedAt: new Date().toISOString(),
  }
}

function resolveApiKey(): string {
  const env = getEnv()
  return (
    (env.IMAGE_API_KEY || '').trim() ||
    (process.env.GOOGLE_API_KEY || '').trim() ||
    (process.env.GEMINI_API_KEY || '').trim() ||
    (process.env.GEMINI_API || '').trim()
  )
}

function resolveModel(): string {
  return (process.env.IMAGE_MODEL || '').trim() || DEFAULT_MODEL
}

type GeminiPart = {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
}

/**
 * Google Gemini image generation (AI Studio / Gemini API key).
 * Uses gemini-2.5-flash-image by default.
 */
export function createGoogleImageProvider(name = 'google-gemini-image'): ImageProvider {
  return {
    kind: 'image',
    name,
    validateConfig(): ProviderConfigValidation {
      const key = resolveApiKey()
      const missing = key ? [] : ['IMAGE_API_KEY']
      return {
        ok: missing.length === 0,
        missing,
        message: missing.length
          ? 'Set IMAGE_PROVIDER=google and IMAGE_API_KEY (Gemini API key from Google AI Studio)'
          : undefined,
      }
    },
    async healthCheck(): Promise<ProviderHealth> {
      const validation = this.validateConfig()
      if (!validation.ok) return health(name, false, validation.message)
      return health(name, true, `Configured model ${resolveModel()}`)
    },
    async generate(request: ImageGenerateRequest): Promise<ImageGenerateResult> {
      const apiKey = resolveApiKey()
      if (!apiKey) {
        throw new ProviderError('Google image API key missing', {
          provider: name,
          kind: 'image',
          code: 'GOOGLE_IMAGE_CONFIG',
          retryable: false,
        })
      }

      const model = resolveModel()
      const prompt = [
        request.prompt,
        request.negativePrompt ? `Avoid: ${request.negativePrompt}.` : '',
        'Output a single square print-ready merch graphic image.',
      ]
        .filter(Boolean)
        .join(' ')

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
        cache: 'no-store',
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new ProviderError(`Google image HTTP ${res.status}`, {
          provider: name,
          kind: 'image',
          code: 'GOOGLE_IMAGE_HTTP',
          retryable: res.status >= 500 || res.status === 429,
          details: { status: res.status, body: body.slice(0, 500) },
        })
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
      }
      const parts = data.candidates?.[0]?.content?.parts || []
      const imagePart = parts.find((p) => p.inlineData?.data)
      if (!imagePart?.inlineData?.data) {
        throw new ProviderError('Google image response contained no image bytes', {
          provider: name,
          kind: 'image',
          code: 'GOOGLE_IMAGE_EMPTY',
          retryable: true,
        })
      }

      const mimeType = imagePart.inlineData.mimeType || 'image/png'
      const bytes = Buffer.from(imagePart.inlineData.data, 'base64')

      return {
        bytes,
        mimeType,
        model,
        provider: name,
        width: request.width ?? 1024,
        height: request.height ?? 1024,
      }
    },
  }
}
