import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import {
  buildWeeklyReport,
  listProductPerformance,
  seedDemoAnalytics,
  syncAnalyticsMetrics,
  upsertProductMetrics,
} from '@/services/analytics'
import { persistWeeklyReport } from '@/services/analytics/persist'
import type { UpsertMetricInput } from '@/services/analytics/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get('seed') === '1') {
    const report = seedDemoAnalytics()
    await persistWeeklyReport(report)
    return NextResponse.json({ report, products: report.products, source: 'demo' })
  }

  if (searchParams.get('sync') === '1' || searchParams.get('live') === '1') {
    const synced = await syncAnalyticsMetrics()
    return NextResponse.json({
      report: synced.report,
      products: synced.report.products,
      source: synced.source,
      stats: {
        products: synced.products,
        orders: synced.orders,
        shopifyOrders: synced.shopifyOrders,
      },
    })
  }

  const memory = listProductPerformance()
  if (memory.length) {
    const report = buildWeeklyReport()
    return NextResponse.json({ report, products: memory, source: 'memory' })
  }

  const synced = await syncAnalyticsMetrics()
  return NextResponse.json({
    report: synced.report,
    products: synced.report.products,
    source: synced.source,
  })
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const action = (body as { action?: string }).action

  if (action === 'sync') {
    const synced = await syncAnalyticsMetrics()
    return NextResponse.json({
      report: synced.report,
      source: synced.source,
      stats: {
        products: synced.products,
        orders: synced.orders,
        shopifyOrders: synced.shopifyOrders,
      },
    })
  }

  if (action === 'weekly_report') {
    const synced = await syncAnalyticsMetrics()
    await persistWeeklyReport(synced.report)
    return NextResponse.json({ report: synced.report, source: synced.source })
  }

  if (action === 'upsert_metric') {
    const metric = (body as { metric?: UpsertMetricInput }).metric
    if (!metric?.productKey || !metric?.title || !metric?.periodStart) {
      return NextResponse.json(
        { error: 'metric requires productKey, title, periodStart' },
        { status: 400 }
      )
    }
    const performance = upsertProductMetrics(metric)
    return NextResponse.json({ performance })
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
