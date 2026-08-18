import type { Niche } from '@/lib/niches'
import { NICHES } from '@/lib/niches'
import { runTrendEngine } from '@/services/trends/engine'
import type { ScoredTrend } from '@/services/trends/types'
import {
  buildTrendCluster,
  generateConceptCombinations,
  recommendProductsForConcept,
} from '@/services/researchV2/concepts'
import { scoreResearchOpportunity } from '@/services/researchV2/score'
import { SAMPLE_RESEARCH_DATASET } from '@/services/researchV2/sampleDataset'
import {
  RESEARCH_ENGINE_V2_VERSION,
  type ResearchOpportunity,
  type ResearchRecord,
} from '@/services/researchV2/types'

function slugId(niche: string, topic: string): string {
  return `opp:${niche}:${topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)}`
}

function scoredTrendToRecord(scored: ScoredTrend): ResearchRecord {
  const s = scored.signal
  return {
    topic: s.title,
    niche: s.niche,
    source: s.source,
    sourceUrl: s.sourceRefs[0],
    detectedAt: (s.observedAt || new Date()).toISOString(),
    trendVelocity: scored.components.growth,
    searchInterest: scored.components.virality,
    engagementSignals: Math.round((scored.components.virality + scored.components.growth) / 2),
    commercialSignals: scored.components.commercialIntent,
    buyerIntent: scored.commercialPotential,
    seasonality: scored.components.seasonality,
    competition: scored.components.competition,
    visualPatterns: [
      scored.designability >= 60 ? 'strong graphic potential' : 'moderate graphic potential',
    ],
    recurringPhrases: s.keywords.slice(0, 8),
    productTypes: ['tshirt', 'hoodie'],
    audience: `${s.niche} audience`,
    demographicSignals: [s.niche],
    designPatterns: scored.designability >= 70 ? ['maximalist flash graphic'] : ['standard merch graphic'],
    riskSignals: scored.riskFlags,
  }
}

function buildOpportunityFromParts(input: {
  topic: string
  niche: Niche
  sources: string[]
  records: ResearchRecord[]
  conceptsPer?: number
}): ResearchOpportunity {
  const scores = scoreResearchOpportunity({
    niche: input.niche,
    topic: input.topic,
    records: input.records,
    sources: input.sources,
  })
  const cluster = buildTrendCluster(input.topic, input.niche)
  const topConcepts = generateConceptCombinations({
    topic: input.topic,
    niche: input.niche,
    limit: input.conceptsPer ?? 10,
  }).slice(0, 10)
  const productTypesRecommended = recommendProductsForConcept(topConcepts[0]!)

  return {
    id: slugId(input.niche, input.topic),
    topic: input.topic,
    niche: input.niche,
    clusterId: cluster.id,
    records: input.records,
    sources: input.sources,
    scores,
    clusters: cluster,
    topConcepts,
    productTypesRecommended,
    engineVersion: RESEARCH_ENGINE_V2_VERSION,
    createdAt: new Date().toISOString(),
  }
}

export function buildOpportunitiesFromSample(limit = 20): ResearchOpportunity[] {
  return SAMPLE_RESEARCH_DATASET.slice(0, limit).map((row) =>
    buildOpportunityFromParts({
      topic: row.topic,
      niche: row.niche,
      sources: row.sources,
      records: row.records.map((r) => ({
        ...r,
        topic: row.topic,
        niche: row.niche,
        detectedAt: new Date().toISOString(),
      })),
    })
  )
}

/**
 * Research Engine V2: live trends (optional) + sample enrichment → opportunity scores → concepts.
 */
export async function runResearchEngineV2(options: {
  includeLive?: boolean
  includeSample?: boolean
  limit?: number
  niches?: Niche[]
  conceptsPer?: number
} = {}): Promise<ResearchOpportunity[]> {
  const includeLive = options.includeLive ?? true
  const includeSample = options.includeSample ?? true
  const limit = options.limit ?? 20
  const niches = options.niches?.length ? options.niches : [...NICHES]
  const byKey = new Map<string, ResearchOpportunity>()

  if (includeSample) {
    for (const opp of buildOpportunitiesFromSample(Math.max(limit, 20))) {
      if (!niches.includes(opp.niche)) continue
      byKey.set(opp.id, opp)
    }
  }

  if (includeLive) {
    try {
      const scored = await runTrendEngine({
        niches,
        includeCurated: true,
        includeRegisteredTrendProvider: true,
        includeViralMarketplace: true,
        limitPerNiche: 3,
      })
      for (const s of scored) {
        const record = scoredTrendToRecord(s)
        const id = slugId(s.signal.niche, s.signal.title)
        const existing = byKey.get(id)
        if (existing) {
          existing.records.push(record)
          if (!existing.sources.includes(s.signal.source)) existing.sources.push(s.signal.source)
          existing.scores = scoreResearchOpportunity({
            niche: existing.niche,
            topic: existing.topic,
            records: existing.records,
            sources: existing.sources,
          })
        } else {
          byKey.set(
            id,
            buildOpportunityFromParts({
              topic: s.signal.title,
              niche: s.signal.niche,
              sources: [s.signal.source],
              records: [record],
              conceptsPer: options.conceptsPer,
            })
          )
        }
      }
    } catch {
      // live research optional — sample still works
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.scores.opportunityScore - a.scores.opportunityScore)
    .slice(0, limit)
}

export function selectTopOpportunities(
  opportunities: ResearchOpportunity[],
  topN: number,
  options: { excludeHighIpRisk?: boolean } = {}
): ResearchOpportunity[] {
  const excludeHighIp = options.excludeHighIpRisk ?? false
  return [...opportunities]
    .filter((o) => (excludeHighIp ? o.scores.ipRisk < 55 : true))
    .sort((a, b) => b.scores.opportunityScore - a.scores.opportunityScore)
    .slice(0, topN)
}
