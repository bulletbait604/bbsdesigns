import type { Niche } from '@/lib/niches'

export type TrafficSource =
  | 'organic'
  | 'paid'
  | 'social'
  | 'direct'
  | 'email'
  | 'referral'
  | 'unknown'

export type LifecycleDecision = 'KEEP' | 'OPTIMIZE' | 'RETIRE_CANDIDATE'

export type ProductMetricSnapshot = {
  productKey: string
  title: string
  niche?: Niche | 'unknown'
  periodStart: string
  periodEnd: string
  views: number
  sessions: number
  addToCart: number
  checkout: number
  orders: number
  revenueCents: number
  estimatedProfitCents: number
  refundsCents: number
  refundUnits: number
  trafficBySource: Partial<Record<TrafficSource, number>>
}

export type ProductPerformance = ProductMetricSnapshot & {
  conversionRate: number
  addToCartRate: number
  checkoutRate: number
  refundRate: number
  decision: LifecycleDecision
  decisionReasons: string[]
}

export type WeeklyAnalyticsReport = {
  id: string
  weekStart: string
  weekEnd: string
  generatedAt: string
  totals: {
    views: number
    sessions: number
    addToCart: number
    checkout: number
    orders: number
    revenueCents: number
    estimatedProfitCents: number
    refundsCents: number
    conversionRate: number
  }
  byDecision: Record<LifecycleDecision, number>
  products: ProductPerformance[]
  /** Narrative built only from stored metrics — never invents numbers */
  summary: string
  trafficBySource: Partial<Record<TrafficSource, number>>
}

export type UpsertMetricInput = {
  productKey: string
  title: string
  niche?: ProductMetricSnapshot['niche']
  periodStart: Date | string
  periodEnd?: Date | string
  views?: number
  sessions?: number
  addToCart?: number
  checkout?: number
  orders?: number
  revenueCents?: number
  estimatedProfitCents?: number
  refundsCents?: number
  refundUnits?: number
  trafficBySource?: Partial<Record<TrafficSource, number>>
}
