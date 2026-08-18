import { isMongoConfigured, connectMongo } from '@/lib/db'
import { ResearchOpportunityModel } from '@/models/ResearchOpportunity'
import type { ResearchOpportunity } from '@/services/researchV2/types'

export async function persistResearchOpportunities(
  opportunities: ResearchOpportunity[],
  limit = 40
): Promise<number> {
  if (!isMongoConfigured()) return 0
  await connectMongo()
  let n = 0
  for (const opp of opportunities.slice(0, limit)) {
    await ResearchOpportunityModel.findOneAndUpdate(
      { opportunityId: opp.id },
      {
        $set: {
          opportunityId: opp.id,
          topic: opp.topic,
          niche: opp.niche,
          sources: opp.sources,
          opportunityScore: opp.scores.opportunityScore,
          scores: opp.scores,
          records: opp.records,
          cluster: opp.clusters || null,
          topConcepts: opp.topConcepts,
          productTypesRecommended: opp.productTypesRecommended,
          engineVersion: opp.engineVersion,
          status: 'researched',
        },
      },
      { upsert: true, new: true }
    )
    n += 1
  }
  return n
}
