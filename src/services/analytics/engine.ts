import { createHash } from 'crypto'
import type {
  LifecycleDecision,
  ProductMetricSnapshot,
  ProductPerformance,
  TrafficSource,
  UpsertMetricInput,
  WeeklyAnalyticsReport,
} from '@/services/analytics/types'
import { enrichPerformance } from '@/services/analytics/decide'
import { logger } from '@/lib/logger'

function toIsoDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toISOString()
}

function startOfUtcWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = x.getUTCDay() || 7
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1))
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function endOfUtcWeek(weekStart: Date): Date {
  const x = new Date(weekStart)
  x.setUTCDate(x.getUTCDate() + 7)
  return x
}

function metricKey(productKey: string, periodStart: string): string {
  return `${productKey}::${periodStart.slice(0, 10)}`
}

function normalizeInput(input: UpsertMetricInput): ProductMetricSnapshot {
  const periodStart = toIsoDate(input.periodStart)
  const periodEnd = input.periodEnd
    ? toIsoDate(input.periodEnd)
    : new Date(new Date(periodStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  return {
    productKey: input.productKey,
    title: input.title,
    niche: input.niche || 'unknown',
    periodStart,
    periodEnd,
    views: Math.max(0, input.views ?? 0),
    sessions: Math.max(0, input.sessions ?? 0),
    addToCart: Math.max(0, input.addToCart ?? 0),
    checkout: Math.max(0, input.checkout ?? 0),
    orders: Math.max(0, input.orders ?? 0),
    revenueCents: Math.max(0, input.revenueCents ?? 0),
    estimatedProfitCents: input.estimatedProfitCents ?? 0,
    refundsCents: Math.max(0, input.refundsCents ?? 0),
    refundUnits: Math.max(0, input.refundUnits ?? 0),
    trafficBySource: input.trafficBySource || {},
  }
}

/** In-memory store — used for tests and when Mongo is unavailable. */
const memoryMetrics = new Map<string, ProductMetricSnapshot>()
const memoryReports = new Map<string, WeeklyAnalyticsReport>()

export function clearAnalyticsMemory(): void {
  memoryMetrics.clear()
  memoryReports.clear()
}

export function upsertProductMetrics(input: UpsertMetricInput): ProductPerformance {
  const snapshot = normalizeInput(input)
  const key = metricKey(snapshot.productKey, snapshot.periodStart)
  memoryMetrics.set(key, snapshot)
  const enriched = enrichPerformance(snapshot)
  logger.info('analytics_metric_upserted', {
    productKey: snapshot.productKey,
    decision: enriched.decision,
    orders: snapshot.orders,
  })
  return enriched
}

export function listProductMetrics(): ProductMetricSnapshot[] {
  return [...memoryMetrics.values()].sort((a, b) => a.productKey.localeCompare(b.productKey))
}

export function listProductPerformance(): ProductPerformance[] {
  return listProductMetrics().map(enrichPerformance)
}

function sumTraffic(
  items: ProductMetricSnapshot[]
): Partial<Record<TrafficSource, number>> {
  const out: Partial<Record<TrafficSource, number>> = {}
  for (const item of items) {
    for (const [source, count] of Object.entries(item.trafficBySource || {})) {
      const s = source as TrafficSource
      out[s] = (out[s] || 0) + (count || 0)
    }
  }
  return out
}

/**
 * Weekly report from stored metrics only. Does not invent KPIs.
 * Does not delete or auto-retire products.
 */
export function buildWeeklyReport(anchor: Date = new Date()): WeeklyAnalyticsReport {
  const weekStart = startOfUtcWeek(anchor)
  const weekEnd = endOfUtcWeek(weekStart)
  const weekStartIso = weekStart.toISOString()
  const weekEndIso = weekEnd.toISOString()

  const inWeek = listProductMetrics().filter((m) => {
    const start = new Date(m.periodStart).getTime()
    return start >= weekStart.getTime() && start < weekEnd.getTime()
  })

  const products = inWeek.map(enrichPerformance)
  const totals = products.reduce(
    (acc, p) => {
      acc.views += p.views
      acc.sessions += p.sessions
      acc.addToCart += p.addToCart
      acc.checkout += p.checkout
      acc.orders += p.orders
      acc.revenueCents += p.revenueCents
      acc.estimatedProfitCents += p.estimatedProfitCents
      acc.refundsCents += p.refundsCents
      return acc
    },
    {
      views: 0,
      sessions: 0,
      addToCart: 0,
      checkout: 0,
      orders: 0,
      revenueCents: 0,
      estimatedProfitCents: 0,
      refundsCents: 0,
      conversionRate: 0,
    }
  )
  const denom = totals.sessions || totals.views
  totals.conversionRate = denom > 0 ? Math.round((totals.orders / denom) * 10000) / 100 : 0

  const byDecision: Record<LifecycleDecision, number> = {
    KEEP: 0,
    OPTIMIZE: 0,
    RETIRE_CANDIDATE: 0,
  }
  for (const p of products) byDecision[p.decision] += 1

  const trafficBySource = sumTraffic(inWeek)
  const summary = composeSummary({
    weekStartIso,
    weekEndIso,
    totals,
    byDecision,
    products,
    trafficBySource,
  })

  const id = createHash('sha256')
    .update(`weekly|${weekStartIso}|${products.map((p) => p.productKey).sort().join(',')}`)
    .digest('hex')
    .slice(0, 24)

  const report: WeeklyAnalyticsReport = {
    id,
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    generatedAt: new Date().toISOString(),
    totals,
    byDecision,
    products,
    summary,
    trafficBySource,
  }

  memoryReports.set(id, report)
  logger.info('analytics_weekly_report', {
    id,
    products: products.length,
    keep: byDecision.KEEP,
    optimize: byDecision.OPTIMIZE,
    retire: byDecision.RETIRE_CANDIDATE,
  })
  return report
}

export function getLatestWeeklyReport(): WeeklyAnalyticsReport | null {
  const reports = [...memoryReports.values()].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt)
  )
  return reports[0] || null
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function composeSummary(args: {
  weekStartIso: string
  weekEndIso: string
  totals: WeeklyAnalyticsReport['totals']
  byDecision: Record<LifecycleDecision, number>
  products: ProductPerformance[]
  trafficBySource: Partial<Record<TrafficSource, number>>
}): string {
  const { weekStartIso, weekEndIso, totals, byDecision, products, trafficBySource } = args
  const topSource =
    Object.entries(trafficBySource).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0] || 'unknown'

  if (products.length === 0) {
    return [
      `Weekly analytics report (${weekStartIso.slice(0, 10)} → ${weekEndIso.slice(0, 10)}).`,
      'No stored product metrics for this week.',
      'Decisions KEEP / OPTIMIZE / RETIRE_CANDIDATE require real metrics — nothing was invented.',
      'No products were deleted or auto-retired.',
    ].join(' ')
  }

  const retireTitles = products
    .filter((p) => p.decision === 'RETIRE_CANDIDATE')
    .map((p) => p.title)
    .slice(0, 5)
  const optimizeTitles = products
    .filter((p) => p.decision === 'OPTIMIZE')
    .map((p) => p.title)
    .slice(0, 5)

  return [
    `Weekly analytics report (${weekStartIso.slice(0, 10)} → ${weekEndIso.slice(0, 10)}).`,
    `Tracked ${products.length} product(s) from stored metrics only.`,
    `Views ${totals.views}, sessions ${totals.sessions}, add-to-cart ${totals.addToCart}, checkouts ${totals.checkout}, orders ${totals.orders}.`,
    `Conversion ${totals.conversionRate}%, revenue ${money(totals.revenueCents)}, estimated profit ${money(totals.estimatedProfitCents)}, refunds ${money(totals.refundsCents)}.`,
    `Top traffic source in stored data: ${topSource}.`,
    `Lifecycle advice — KEEP ${byDecision.KEEP}, OPTIMIZE ${byDecision.OPTIMIZE}, RETIRE_CANDIDATE ${byDecision.RETIRE_CANDIDATE}.`,
    optimizeTitles.length ? `Optimize candidates: ${optimizeTitles.join('; ')}.` : '',
    retireTitles.length
      ? `Retire candidates (manual review only, not deleted): ${retireTitles.join('; ')}.`
      : '',
    'Automatic product deletion remains disabled.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Seed helpers for dashboard/demo when live Shopify analytics are not synced yet. */
export function seedDemoAnalytics(anchor: Date = new Date()): WeeklyAnalyticsReport {
  clearAnalyticsMemory()
  const week = startOfUtcWeek(anchor).toISOString()

  upsertProductMetrics({
    productKey: 'demo-sunburnt',
    title: 'Sunburnt Competitive Still Here Tee',
    niche: 'softball',
    periodStart: week,
    views: 420,
    sessions: 310,
    addToCart: 28,
    checkout: 14,
    orders: 9,
    revenueCents: 26991,
    estimatedProfitCents: 8100,
    refundsCents: 0,
    refundUnits: 0,
    trafficBySource: { organic: 180, social: 90, direct: 40 },
  })

  upsertProductMetrics({
    productKey: 'demo-lag',
    title: 'Lag Is A Lifestyle Tee',
    niche: 'gaming',
    periodStart: week,
    views: 260,
    sessions: 190,
    addToCart: 18,
    checkout: 6,
    orders: 2,
    revenueCents: 5998,
    estimatedProfitCents: 1400,
    refundsCents: 0,
    refundUnits: 0,
    trafficBySource: { organic: 100, social: 70, paid: 20 },
  })

  upsertProductMetrics({
    productKey: 'demo-swing',
    title: 'I Only Swing At Bad Ideas Tee',
    niche: 'baseball',
    periodStart: week,
    views: 95,
    sessions: 70,
    addToCart: 8,
    checkout: 2,
    orders: 0,
    revenueCents: 0,
    estimatedProfitCents: 0,
    refundsCents: 0,
    refundUnits: 0,
    trafficBySource: { organic: 50, social: 20 },
  })

  upsertProductMetrics({
    productKey: 'demo-stale',
    title: 'Championship Circuit Tee',
    niche: 'gaming',
    periodStart: week,
    views: 18,
    sessions: 12,
    addToCart: 0,
    checkout: 0,
    orders: 0,
    revenueCents: 0,
    estimatedProfitCents: 0,
    refundsCents: 0,
    refundUnits: 0,
    trafficBySource: { direct: 12 },
  })

  return buildWeeklyReport(anchor)
}
