import { describe, expect, it, vi } from 'vitest'
import { withRetry } from '@/lib/retry'

describe('withRetry', () => {
  it('retries with exponential backoff then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('temp'))
      .mockRejectedValueOnce(new Error('temp'))
      .mockResolvedValue('ok')

    const result = await withRetry('unit', fn, { retries: 3, baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
