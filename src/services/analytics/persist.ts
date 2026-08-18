import { isMongoConfigured, connectMongo } from '@/lib/db'
import { WeeklyAnalyticsReport } from '@/models/WeeklyAnalyticsReport'
import { ProductLifecycleDecision } from '@/models/ProductLifecycleDecision'
import { logger } from '@/lib/logger'
import type { WeeklyAnalyticsReport as Report } from '@/services/analytics/types'

/** Persist a weekly report + advisory lifecycle decisions. Never deletes products. */
export async function persistWeeklyReport(report: Report): Promise<void> {
  if (!isMongoConfigured()) {
    logger.info('analytics_persist_skipped_no_mongo', { reportId: report.id })
    return
  }

  await connectMongo()

  await WeeklyAnalyticsReport.findOneAndUpdate(
    { reportId: report.id },
    {
      reportId: report.id,
      weekStart: new Date(report.weekStart),
      weekEnd: new Date(report.weekEnd),
      generatedAt: new Date(report.generatedAt),
      totals: report.totals,
      byDecision: report.byDecision,
      trafficBySource: report.trafficBySource,
      summary: report.summary,
      productCount: report.products.length,
      products: report.products,
    },
    { upsert: true, new: true }
  )

  for (const product of report.products) {
    await ProductLifecycleDecision.findOneAndUpdate(
      { productKey: product.productKey, weekStart: new Date(report.weekStart) },
      {
        productKey: product.productKey,
        title: product.title,
        decision: product.decision,
        reasons: product.decisionReasons,
        autoApplied: false,
        metricsSnapshot: product,
        weekStart: new Date(report.weekStart),
      },
      { upsert: true, new: true }
    )
  }

  logger.info('analytics_report_persisted', {
    reportId: report.id,
    products: report.products.length,
  })
}
