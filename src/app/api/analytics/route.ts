import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import {
  buildWeeklyReport,
  listProductPerformance,
  seedDemoAnalytics,
  upsertProductMetrics,
} from '@/services/analytics'
import { persistWeeklyReport } from '@/services/analytics/persist'
import type { UpsertMetricInput } from '@/services/analytics/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get('seed') === '1') {
    const report = seedDemoAnalytics()
    await persistWeeklyReport(report)
    return NextResponse.json({ report, products: report.products })
  }

  const report = buildWeeklyReport()
  return NextResponse.json({
    report,
    products: listProductPerformance(),
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

  if (action === 'weekly_report') {
    const report = buildWeeklyReport()
    await persistWeeklyReport(report)
    return NextResponse.json({ report })
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
