export { RESEARCH_ENGINE_V2_VERSION } from '@/services/researchV2/types'
export type {
  ResearchRecord,
  ResearchOpportunity,
  ScoreBreakdown,
  TrendCluster,
  ConceptCombination,
} from '@/services/researchV2/types'
export {
  runResearchEngineV2,
  buildOpportunitiesFromSample,
  selectTopOpportunities,
} from '@/services/researchV2/engine'
export {
  scoreResearchOpportunity,
  crossPlatformMomentumScore,
  giftIntentScore,
  seasonalOpportunityScore,
  detectPurchaseIntentLanguage,
} from '@/services/researchV2/score'
export {
  generateConceptCombinations,
  buildTrendCluster,
  recommendProductsForConcept,
} from '@/services/researchV2/concepts'
export { listDesignStyles, recommendStylesForNiche, DESIGN_STYLE_LIBRARY } from '@/services/researchV2/styleLibrary'
export { SAMPLE_RESEARCH_DATASET } from '@/services/researchV2/sampleDataset'
