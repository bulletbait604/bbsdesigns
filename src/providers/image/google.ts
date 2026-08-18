import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { ProviderError } from '@/providers/errors'
import type {
  ImageGenerateRequest,
  ImageGenerateResult,
  ImageProvider,
  ProviderConfigValidation,
  ProviderHealth,
} from '@/providers/types'

/** Current GA Nano Banana 2 — preferred over deprecated gemini-2.5-flash-image. */
const DEFAULT_MODEL = 'gemini-3.1-flash-image'

/** Tried in order when the primary model returns a model-related 400/404. */
const FALLBACK_MODELS = [
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-lite-image',
]

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

/** Strip accidental `models/` prefix from env overrides. */
export function normalizeImageModelId(raw: string): string {
  const trimmed = raw.trim()
  return trimmed.replace(/^models\//i, '')
}

function resolvePrimaryModel(): string {
  return normalizeImageModelId((process.env.IMAGE_MODEL || '').trim() || DEFAULT_MODEL)
}

function modelCandidates(primary: string): string[] {
  const ordered = [primary, ...FALLBACK_MODELS]
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of ordered) {
    const id = normalizeImageModelId(m)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

type GeminiPart = {
  text?: string
  inlineData?: { mimeType?: string; data?: string }
}

function parseGoogleErrorMessage(body: string): string {
  try {
    const json = JSON.parse(body) as {
      error?: { message?: string; status?: string; code?: number }
    }
    const msg = json.error?.message?.trim()
    if (msg) return msg
  } catch {
    /* plain text */
  }
  return body.trim().slice(0, 280)
}

function isModelRelatedFailure(status: number, body: string): boolean {
  if (status === 404) return true
  if (status !== 400) return false
  const lower = body.toLowerCase()
  return (
    lower.includes('not found') ||
    lower.includes('not supported') ||
    lower.includes('unknown model') ||
    lower.includes('invalid model') ||
    lower.includes('is not found') ||
    lower.includes('no longer available') ||
    lower.includes('deprecated') ||
    lower.includes('response modalities') ||
    lower.includes('responsemodalities')
  )
}

async function generateOnce(opts: {
  name: string
  apiKey: string
  model: string
  prompt: string
}): Promise<ImageGenerateResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`
  const modalityVariants: Array<Array<'TEXT' | 'IMAGE'>> = [
    ['TEXT', 'IMAGE'],
    ['IMAGE'],
  ]

  let lastHttpError: ProviderError | null = null

  for (const modalities of modalityVariants) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': opts.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
        generationConfig: {
          responseModalities: modalities,
        },
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const googleMessage = parseGoogleErrorMessage(body)
      lastHttpError = new ProviderError(
        `Google image HTTP ${res.status}: ${googleMessage || res.statusText}`,
        {
          provider: opts.name,
          kind: 'image',
          code: 'GOOGLE_IMAGE_HTTP',
          retryable: res.status >= 500 || res.status === 429,
          details: {
            status: res.status,
            model: opts.model,
            body: body.slice(0, 800),
            googleMessage,
            responseModalities: modalities,
          },
        }
      )
      const lower = body.toLowerCase()
      const modalitiesIssue =
        res.status === 400 &&
        (lower.includes('responsemodality') ||
          lower.includes('response_modalit') ||
          lower.includes('response modalities') ||
          lower.includes('modalities'))
      if (modalitiesIssue && modalities === modalityVariants[0]) continue
      throw lastHttpError
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
    }
    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p) => p.inlineData?.data)
    if (!imagePart?.inlineData?.data) {
      throw new ProviderError('Google image response contained no image bytes', {
        provider: opts.name,
        kind: 'image',
        code: 'GOOGLE_IMAGE_EMPTY',
        retryable: true,
        details: { model: opts.model, responseModalities: modalities },
      })
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png'
    const bytes = Buffer.from(imagePart.inlineData.data, 'base64')

    return {
      bytes,
      mimeType,
      model: opts.model,
      provider: opts.name,
      width: 1024,
      height: 1024,
    }
  }

  throw (
    lastHttpError ||
    new ProviderError('Google image generation failed', {
      provider: opts.name,
      kind: 'image',
      code: 'GOOGLE_IMAGE_HTTP',
      retryable: false,
      details: { model: opts.model },
    })
  )
}

/**
 * Google Gemini image generation (AI Studio / Gemini API key).
 * Defaults to gemini-3.1-flash-image with fallbacks if a model is unavailable.
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
      return health(name, true, `Configured model ${resolvePrimaryModel()}`)
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

      const prompt = [
        request.prompt,
        request.negativePrompt ? `Avoid: ${request.negativePrompt}.` : '',
        'Output a single square print-ready merch graphic image.',
      ]
        .filter(Boolean)
        .join(' ')

      const candidates = modelCandidates(resolvePrimaryModel())
      let lastError: ProviderError | null = null

      for (let i = 0; i < candidates.length; i++) {
        const model = candidates[i]
        try {
          const result = await generateOnce({ name, apiKey, model, prompt })
          if (i > 0) {
            logger.warn('google_image_model_fallback_used', {
              primary: candidates[0],
              used: model,
            })
          }
          return {
            ...result,
            width: request.width ?? 1024,
            height: request.height ?? 1024,
          }
        } catch (error) {
          if (!(error instanceof ProviderError) || error.code !== 'GOOGLE_IMAGE_HTTP') {
            throw error
          }
          lastError = error
          const details = error.details as { status?: number; body?: string } | undefined
          const status = details?.status ?? 0
          const body = details?.body || error.message
          const canFallback = i < candidates.length - 1 && isModelRelatedFailure(status, body)
          if (!canFallback) throw error
          logger.warn('google_image_model_retry', {
            failedModel: model,
            nextModel: candidates[i + 1],
            status,
          })
        }
      }

      throw (
        lastError ||
        new ProviderError('Google image generation failed', {
          provider: name,
          kind: 'image',
          code: 'GOOGLE_IMAGE_HTTP',
          retryable: false,
        })
      )
    },
  }
}
