import { getEnv } from '@/lib/env'

export type FeatureFlags = {
  humanApproval: boolean
  autoPublish: boolean
  useResearchV2: boolean
  useDesignV2: boolean
  useProductIntelligenceV2: boolean
  maxProductsPerDay: number
  minDesignOverallScore: number
  designConceptsPerOpportunity: number
}

function boolEnv(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw === '') return defaultValue
  const s = raw.trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

function intEnv(raw: string | undefined, defaultValue: number, min: number, max: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return defaultValue
  return Math.min(max, Math.max(min, Math.floor(n)))
}

export function getFeatureFlags(): FeatureFlags {
  const env = getEnv()
  return {
    humanApproval: env.HUMAN_APPROVAL,
    // Hard gate: never auto-publish while human approval is required.
    autoPublish: env.AUTO_PUBLISH && !env.HUMAN_APPROVAL,
    useResearchV2: boolEnv(process.env.USE_RESEARCH_V2, true),
    useDesignV2: boolEnv(process.env.USE_DESIGN_V2, true),
    useProductIntelligenceV2: boolEnv(process.env.USE_PRODUCT_INTELLIGENCE_V2, true),
    maxProductsPerDay: intEnv(process.env.MAX_PRODUCTS_PER_DAY, 10, 1, 40),
    minDesignOverallScore: intEnv(process.env.MIN_DESIGN_OVERALL_SCORE, 85, 50, 100),
    designConceptsPerOpportunity: intEnv(process.env.DESIGN_CONCEPTS_PER_OPP, 5, 2, 8),
  }
}
