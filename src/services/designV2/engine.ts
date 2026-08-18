import { getFeatureFlags } from '@/lib/featureFlags'
import { buildCreativeBrief, buildImagePromptFromBrief } from '@/services/designV2/brief'
import { reviewDesignV2 } from '@/services/designV2/review'
import {
  DESIGN_ENGINE_V2_VERSION,
  DESIGN_PROMPT_V2_VERSION,
  type DesignDirectionCandidate,
  type DesignEngineV2Result,
} from '@/services/designV2/types'
import type { ConceptCombination } from '@/services/researchV2/types'
import type { ResearchOpportunity } from '@/services/researchV2/types'

/**
 * Design Engine V2: multiple creative directions → briefs → prompts → pre-image review.
 * Does not auto-publish. Image generation stays in the pipeline job (cost-controlled).
 */
export function runDesignEngineV2(input: {
  opportunity: ResearchOpportunity
  concepts?: ConceptCombination[]
  directionsPerConcept?: number
}): DesignEngineV2Result {
  const flags = getFeatureFlags()
  const concepts = (input.concepts || input.opportunity.topConcepts).slice(
    0,
    Math.max(2, flags.designConceptsPerOpportunity)
  )
  const directions: DesignDirectionCandidate[] = []

  for (const concept of concepts) {
    const brief = buildCreativeBrief(concept)
    const { prompt, negativePrompt } = buildImagePromptFromBrief(brief)
    const preImageReview = reviewDesignV2({ brief, prompt, negativePrompt })
    directions.push({
      brief,
      prompt,
      negativePrompt,
      promptVersion: DESIGN_PROMPT_V2_VERSION,
      preImageReview,
      concept,
    })
  }

  const accepted = directions.filter((d) => d.preImageReview.decision !== 'REJECT')
  const rejected = directions.filter((d) => d.preImageReview.decision === 'REJECT')
  accepted.sort(
    (a, b) => b.preImageReview.scores.overallScore - a.preImageReview.scores.overallScore
  )
  const selected = accepted.slice(0, 2)

  return {
    opportunityId: input.opportunity.id,
    directions,
    accepted,
    rejected,
    selected,
    engineVersion: DESIGN_ENGINE_V2_VERSION,
  }
}

export function runDesignEngineV2Batch(
  opportunities: ResearchOpportunity[],
  maxProducts = 10
): DesignEngineV2Result[] {
  const flags = getFeatureFlags()
  const cap = Math.min(maxProducts, flags.maxProductsPerDay)
  const results: DesignEngineV2Result[] = []
  for (const opp of opportunities.slice(0, cap * 2)) {
    const result = runDesignEngineV2({ opportunity: opp })
    if (result.selected.length) results.push(result)
    if (results.length >= cap) break
  }
  return results
}
