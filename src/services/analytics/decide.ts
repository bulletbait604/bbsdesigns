import type { LifecycleDecision, ProductMetricSnapshot, ProductPerformance } from '@/services/analytics/types'

function rate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0
  return Math.round((numerator / denominator) * 10000) / 100
}

/**
 * Lifecycle recommendations from stored metrics only.
 * Never deletes or retires products automatically — RETIRE_CANDIDATE is advisory.
 */
export function decideLifecycle(metrics: ProductMetricSnapshot): {
  decision: LifecycleDecision
  reasons: string[]
} {
  const conversionRate = rate(metrics.orders, metrics.sessions || metrics.views)
  const refundRate = rate(metrics.refundUnits, metrics.orders)
  const addToCartRate = rate(metrics.addToCart, metrics.sessions || metrics.views)
  const reasons: string[] = []

  const lowTraffic = metrics.views < 40 && metrics.sessions < 25
  const noOrders = metrics.orders === 0
  const highRefunds = refundRate >= 25 && metrics.orders >= 4
  const weakConversion = conversionRate < 0.8 && (metrics.sessions >= 80 || metrics.views >= 120)
  const someInterest = metrics.addToCart >= 3 || addToCartRate >= 4
  const healthy =
    metrics.orders >= 3 &&
    conversionRate >= 1.5 &&
    refundRate < 15 &&
    metrics.estimatedProfitCents > 0

  if (highRefunds) {
    reasons.push(`refund_rate_${refundRate}%`)
    return { decision: 'RETIRE_CANDIDATE', reasons }
  }

  if (lowTraffic && noOrders) {
    reasons.push('low_traffic_zero_orders')
    return { decision: 'RETIRE_CANDIDATE', reasons }
  }

  if (noOrders && (metrics.views >= 120 || metrics.sessions >= 80)) {
    reasons.push('traffic_without_orders')
    return { decision: 'RETIRE_CANDIDATE', reasons }
  }

  if (healthy) {
    reasons.push(`conversion_${conversionRate}%`, `orders_${metrics.orders}`)
    return { decision: 'KEEP', reasons }
  }

  if (weakConversion || (someInterest && conversionRate < 2)) {
    reasons.push(
      weakConversion ? `weak_conversion_${conversionRate}%` : `cart_interest_low_conv_${conversionRate}%`
    )
    return { decision: 'OPTIMIZE', reasons }
  }

  if (metrics.orders >= 1 && refundRate < 20) {
    reasons.push(`orders_${metrics.orders}`, 'watch_performance')
    return { decision: 'KEEP', reasons }
  }

  reasons.push('insufficient_signal_optimize')
  return { decision: 'OPTIMIZE', reasons }
}

export function enrichPerformance(metrics: ProductMetricSnapshot): ProductPerformance {
  const denom = metrics.sessions || metrics.views
  const { decision, reasons } = decideLifecycle(metrics)
  return {
    ...metrics,
    conversionRate: rate(metrics.orders, denom),
    addToCartRate: rate(metrics.addToCart, denom),
    checkoutRate: rate(metrics.checkout, denom),
    refundRate: rate(metrics.refundUnits, metrics.orders),
    decision,
    decisionReasons: reasons,
  }
}
