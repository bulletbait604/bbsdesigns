import { afterEach, describe, expect, it } from 'vitest'
import { callProvider } from '@/providers/call'
import { ProviderError } from '@/providers/errors'
import {
  clearProviders,
  getProvider,
  healthCheckAll,
  listProviders,
  registerProvider,
} from '@/providers/registry'
import { bootstrapProviders } from '@/providers/bootstrap'
import { createStubAiTextProvider, createStubTrendProvider } from '@/providers/stubs'
import { withTimeout } from '@/providers/timeout'
import { resetEnvCache } from '@/lib/env'

describe('provider architecture', () => {
  afterEach(() => {
    clearProviders()
    resetEnvCache()
  })

  it('registers interface-based providers without vendor lock-in', async () => {
    registerProvider('ai_text', createStubAiTextProvider('test-ai'))
    registerProvider('trend', createStubTrendProvider('test-trend'))

    const ai = getProvider('ai_text')
    const trend = getProvider('trend')

    expect(ai.validateConfig().ok).toBe(true)
    expect(trend.validateConfig().ok).toBe(true)

    const completion = await ai.complete({ prompt: 'hello merch' })
    expect(completion.provider).toBe('test-ai')
    expect(completion.text).toContain('hello merch')

    const signals = await trend.fetchSignals({ niche: 'gaming', limit: 2 })
    expect(signals).toHaveLength(2)
  })

  it('bootstraps all six provider kinds', async () => {
    bootstrapProviders()
    expect(listProviders()).toHaveLength(6)
    const health = await healthCheckAll()
    expect(health.every((h) => typeof h.ok === 'boolean')).toBe(true)
  })

  it('times out provider calls with structured errors', async () => {
    await expect(
      withTimeout(new Promise(() => undefined), 20, {
        provider: 'test',
        kind: 'ai_text',
        label: 'slow-call',
      })
    ).rejects.toMatchObject({
      name: 'ProviderError',
      code: 'PROVIDER_TIMEOUT',
      retryable: true,
    })
  })

  it('wraps failures as ProviderError via callProvider', async () => {
    await expect(
      callProvider(
        async () => {
          throw new Error('boom')
        },
        { provider: 'test', kind: 'image', label: 'fail-call', retries: 0, timeoutMs: 1000 }
      )
    ).rejects.toBeInstanceOf(ProviderError)
  })
})
