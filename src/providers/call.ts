import { sleep } from '@/lib/sleep'
import { logger } from '@/lib/logger'
import { isProviderError, ProviderError } from '@/providers/errors'
import { withTimeout } from '@/providers/timeout'

export type ProviderCallOptions = {
  provider: string
  kind: string
  label: string
  timeoutMs?: number
  retries?: number
  baseDelayMs?: number
}

/**
 * Shared call wrapper: timeout + retry only for retryable provider failures.
 */
export async function callProvider<T>(
  fn: () => Promise<T>,
  opts: ProviderCallOptions
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 30_000
  const retries = opts.retries ?? 2
  const baseDelayMs = opts.baseDelayMs ?? 250
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, {
        provider: opts.provider,
        kind: opts.kind,
        label: opts.label,
      })
    } catch (error) {
      lastError = error
      const retryable = isProviderError(error) ? error.retryable : true
      if (!retryable || attempt === retries) break
      const delay = baseDelayMs * 2 ** attempt
      logger.warn('provider_retry', {
        label: opts.label,
        provider: opts.provider,
        attempt: attempt + 1,
        delay,
      })
      await sleep(delay)
    }
  }

  if (isProviderError(lastError)) throw lastError
  throw new ProviderError(lastError instanceof Error ? lastError.message : String(lastError), {
    provider: opts.provider,
    kind: opts.kind,
    code: 'PROVIDER_CALL_FAILED',
    retryable: false,
    details: lastError,
  })
}
