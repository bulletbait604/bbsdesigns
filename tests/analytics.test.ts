import { afterEach, describe, expect, it } from 'vitest'
import { decideLifecycle, enrichPerformance } from '@/services/analytics/decide'
import {
  buildWeeklyReport,
  clearAnalyticsMemory,
  seedDemoAnalytics,
  upsertProductMetrics,
} from '@/services/analytics/engine'
import type { ProductMetricSnapshot } from '@/services/analytics/types'

function base(partial: Partial<ProductMetricSnapshot>): ProductMetricSnapshot {
  return {
    productKey: 'p1',
    title: 'Test Tee',
    niche: 'gaming',
    periodStart: new Date().toISOString(),
    periodEnd: new Date().toISOString(),
    views: 0,
    sessions: 0,
    addToCart: 0,
    checkout: 0,
    orders: 0,
    revenueCents: 0,
    estimatedProfitCents: 0,
    refundsCents: 0,
    refundUnits: 0,
    trafficBySource: {},
    ...partial,
  }
}

describe('analytics lifecycle decisions', () => {
  it('marks KEEP for healthy converters', () => {
    const { decision } = decideLifecycle(
      base({
        views: 400,
        sessions: 300,
        orders: 8,
        estimatedProfitCents: 5000,
        refundUnits: 0,
      })
    )
    expect(decision).toBe('KEEP')
  })

  it('marks OPTIMIZE for weak conversion with some orders', () => {
    const { decision } = decideLifecycle(
      base({
        views: 200,
        sessions: 150,
        addToCart: 12,
        orders: 1,
        estimatedProfitCents: 200,
        refundUnits: 0,
      })
    )
    expect(decision).toBe('OPTIMIZE')
  })

  it('marks RETIRE_CANDIDATE for traffic with zero orders', () => {
    const { decision } = decideLifecycle(
      base({
        views: 200,
        sessions: 150,
        addToCart: 12,
        orders: 0,
      })
    )
    expect(decision).toBe('RETIRE_CANDIDATE')
  })

  it('marks RETIRE_CANDIDATE for low traffic zero orders', () => {
    const { decision, reasons } = decideLifecycle(
      base({ views: 10, sessions: 8, orders: 0 })
    )
    expect(decision).toBe('RETIRE_CANDIDATE')
    expect(reasons.some((r) => r.includes('low_traffic'))).toBe(true)
  })

  it('marks RETIRE_CANDIDATE for high refunds', () => {
    const { decision } = decideLifecycle(
      base({
        views: 500,
        sessions: 400,
        orders: 10,
        refundUnits: 4,
        estimatedProfitCents: 1000,
      })
    )
    expect(decision).toBe('RETIRE_CANDIDATE')
  })

  it('enrichPerformance computes rates', () => {
    const p = enrichPerformance(
      base({ views: 100, sessions: 100, addToCart: 10, checkout: 5, orders: 2, refundUnits: 0 })
    )
    expect(p.conversionRate).toBe(2)
    expect(p.addToCartRate).toBe(10)
    expect(p.decision).toBeTruthy()
  })
})

describe('analytics weekly report', () => {
  afterEach(() => {
    clearAnalyticsMemory()
  })

  it('builds report only from stored metrics and never invents products', () => {
    const week = new Date()
    // align to current UTC week Monday
    const day = week.getUTCDay() || 7
    week.setUTCDate(week.getUTCDate() - (day - 1))
    week.setUTCHours(0, 0, 0, 0)

    upsertProductMetrics({
      productKey: 'a',
      title: 'A Tee',
      periodStart: week.toISOString(),
      views: 50,
      sessions: 40,
      orders: 0,
    })

    const report = buildWeeklyReport(week)
    expect(report.products).toHaveLength(1)
    expect(report.summary).toContain('stored metrics')
    expect(report.summary).toContain('deletion remains disabled')
    expect(report.totals.views).toBe(50)
  })

  it('seed demo produces KEEP OPTIMIZE and RETIRE candidates', () => {
    const report = seedDemoAnalytics()
    expect(report.products.length).toBe(4)
    expect(report.byDecision.KEEP + report.byDecision.OPTIMIZE + report.byDecision.RETIRE_CANDIDATE).toBe(
      4
    )
    expect(report.byDecision.RETIRE_CANDIDATE).toBeGreaterThanOrEqual(1)
    expect(report.summary.includes('invented')).toBe(false)
  })

  it('empty week report states no metrics', () => {
    const report = buildWeeklyReport()
    expect(report.products).toHaveLength(0)
    expect(report.summary).toContain('No stored product metrics')
  })
})
