export { PRODUCT_INTELLIGENCE_V2_VERSION } from '@/services/productIntelligenceV2/types'
export type {
  DesignDNA,
  PerformanceSignals,
  DesignDNAPerformance,
  ProductIntelligenceSummary,
} from '@/services/productIntelligenceV2/types'
export {
  buildDesignDNA,
  scoreWinner,
  recordDesignDNAPerformance,
  proposeWinnerVariations,
  summarizeIntelligence,
} from '@/services/productIntelligenceV2/engine'
