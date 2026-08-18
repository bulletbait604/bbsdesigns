import type { Niche } from '@/lib/niches'
import type { DesignStyleId } from '@/services/researchV2/styleLibrary'
import type { TypographyTreatment } from '@/services/designV2/types'

export const PRODUCT_INTELLIGENCE_V2_VERSION = 'product-intelligence-v2-2026-08'

export type DesignDNA = {
  niche: Niche
  style: DesignStyleId | string
  typography: TypographyTreatment | string
  colorCount: number
  illustrationLevel: number
  humorLevel: number
  visualImpact: number
  commercialScore: number
  targetAudience: string
  productType: string
}

export type PerformanceSignals = {
  impressions?: number
  clicks?: number
  addToCart?: number
  checkout?: number
  purchases?: number
  conversion?: number
  revenue?: number
  profit?: number
  refunds?: number
  trafficSource?: string
}

export type DesignDNAPerformance = DesignDNA & {
  productId?: string
  designId?: string
  performance: PerformanceSignals
  winnerScore: number
  updatedAt: string
}

export type ProductIntelligenceSummary = {
  bestStyles: Array<{ style: string; avgWinner: number; n: number }>
  bestNiches: Array<{ niche: string; avgWinner: number; n: number }>
  bestProductTypes: Array<{ productType: string; avgWinner: number; n: number }>
  engineVersion: string
}
