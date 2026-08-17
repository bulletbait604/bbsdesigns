import { sleep } from '@/lib/sleep'
import { logger } from '@/lib/logger'

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number }
): Promise<T> {
  const retries = opts?.retries ?? 3
  const baseDelayMs = opts?.baseDelayMs ?? 250
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === retries) break
      const delay = baseDelayMs * 2 ** attempt
      logger.warn('retrying', { label, attempt: attempt + 1, delay })
      await sleep(delay)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
