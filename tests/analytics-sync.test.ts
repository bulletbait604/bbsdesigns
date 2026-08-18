import { afterEach, describe, expect, it } from 'vitest'
import { clearAnalyticsMemory, listProductMetrics } from '@/services/analytics/engine'
import { syncAnalyticsMetrics } from '@/services/analytics/sync'
import { resetEnvCache } from '@/lib/env'

afterEach(() => {
  clearAnalyticsMemory()
  resetEnvCache()
})

describe('analytics sync', () => {
  it('falls back to demo metrics when Mongo is not configured', async () => {
    const prev = process.env.MONGODB_URI
    delete process.env.MONGODB_URI
    resetEnvCache()

    const result = await syncAnalyticsMetrics(new Date('2026-07-28T12:00:00.000Z'))
    expect(result.source).toBe('demo')
    expect(result.products).toBeGreaterThan(0)
    expect(result.report.products.length).toBeGreaterThan(0)
    expect(listProductMetrics().length).toBeGreaterThan(0)

    if (prev !== undefined) process.env.MONGODB_URI = prev
    else delete process.env.MONGODB_URI
    resetEnvCache()
  })
})
