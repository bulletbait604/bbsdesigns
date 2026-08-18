import { getEnv } from '@/lib/env'
import { ProviderError } from '@/providers/errors'
import type {
  AiTextProvider,
  ProviderConfigValidation,
  ProviderHealth,
  TextCompletionRequest,
  TextCompletionResult,
} from '@/providers/types'

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash'

function health(provider: string, ok: boolean, message?: string): ProviderHealth {
  return {
    ok,
    provider,
    kind: 'ai_text',
    message,
    checkedAt: new Date().toISOString(),
  }
}

function resolveApiKey(): string {
  const env = getEnv()
  return (
    (env.AI_TEXT_API_KEY || '').trim() ||
    (env.IMAGE_API_KEY || '').trim() ||
    (process.env.GOOGLE_API_KEY || '').trim() ||
    (process.env.GEMINI_API_KEY || '').trim() ||
    (process.env.GEMINI_API || '').trim()
  )
}

function resolveModel(): string {
  return (
    (process.env.AI_TEXT_MODEL || '').trim() ||
    (process.env.GEMINI_TEXT_MODEL || '').trim() ||
    DEFAULT_TEXT_MODEL
  )
}

/**
 * Google Gemini text completions for slogan / safety assist.
 * Reuses the same Gemini key family already used for images when AI_TEXT_API_KEY is unset.
 */
export function createGoogleTextProvider(name = 'google-gemini-text'): AiTextProvider {
  return {
    kind: 'ai_text',
    name,
    validateConfig(): ProviderConfigValidation {
      const key = resolveApiKey()
      return {
        ok: Boolean(key),
        missing: key ? [] : ['AI_TEXT_API_KEY'],
        message: key
          ? undefined
          : 'Set AI_TEXT_API_KEY or GEMINI_API for slogan generation',
      }
    },
    async healthCheck(): Promise<ProviderHealth> {
      const validation = this.validateConfig()
      if (!validation.ok) return health(name, false, validation.message)
      return health(name, true, `Configured model ${resolveModel()}`)
    },
    async complete(request: TextCompletionRequest): Promise<TextCompletionResult> {
      const apiKey = resolveApiKey()
      if (!apiKey) {
        throw new ProviderError('Google text API key missing', {
          provider: name,
          kind: 'ai_text',
          code: 'GOOGLE_TEXT_CONFIG',
          retryable: false,
        })
      }

      const model = resolveModel()
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [request.system, request.prompt].filter(Boolean).join('\n\n'),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.9,
          maxOutputTokens: request.maxTokens ?? 512,
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new ProviderError(`Gemini text HTTP ${response.status}: ${errText.slice(0, 300)}`, {
          provider: name,
          kind: 'ai_text',
          code: 'GOOGLE_TEXT_HTTP',
          statusCode: response.status,
          retryable: response.status >= 500 || response.status === 429,
        })
      }

      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
      }
      const text =
        json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')?.trim() || ''

      if (!text) {
        throw new ProviderError('Gemini text returned empty content', {
          provider: name,
          kind: 'ai_text',
          code: 'GOOGLE_TEXT_EMPTY',
          retryable: true,
        })
      }

      return {
        text,
        model,
        provider: name,
        usage: {
          inputTokens: json.usageMetadata?.promptTokenCount,
          outputTokens: json.usageMetadata?.candidatesTokenCount,
        },
      }
    },
  }
}

export function shouldUseGoogleText(): boolean {
  const provider = (getEnv().AI_TEXT_PROVIDER || '').trim().toLowerCase()
  const hasKey = Boolean(resolveApiKey())
  if (!hasKey) return false
  return (
    provider === 'google' ||
    provider === 'gemini' ||
    provider === '' /* auto when Gemini key present */
  )
}
