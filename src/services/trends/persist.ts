import { isMongoConfigured, connectMongo } from '@/lib/db'
import { TrendSignal } from '@/models/TrendSignal'
import { TrendScore } from '@/models/TrendScore'
import { logger } from '@/lib/logger'
import type { ScoredTrend } from '@/services/trends/types'

export type PersistedTrend = {
  signalId: string
  scoreId: string
  title: string
  niche: string
  score: number
}

/** Upsert scored trends into Mongo for provenance. */
export async function persistScoredTrends(input: {
  scored: ScoredTrend[]
  storeId: string
  brandId?: string
  limit?: number
}): Promise<PersistedTrend[]> {
  if (!isMongoConfigured() || !input.scored.length) return []
  await connectMongo()

  const sorted = [...input.scored].sort((a, b) => b.score - a.score)
  const take = sorted.slice(0, input.limit ?? 30)
  const out: PersistedTrend[] = []

  for (const item of take) {
    const externalId = `${item.signal.source}:${item.signal.title}`.slice(0, 180)
    const signal = await TrendSignal.findOneAndUpdate(
      {
        storeId: input.storeId,
        source: item.signal.source,
        externalId,
      },
      {
        storeId: input.storeId,
        brandId: input.brandId || undefined,
        niche: item.signal.niche,
        source: item.signal.source,
        externalId,
        title: item.signal.title,
        summary: item.signal.summary || '',
        keywords: item.signal.keywords || [],
        rawPayload: item.signal.raw || {},
        status: 'scored',
        observedAt: item.signal.observedAt || new Date(),
      },
      { upsert: true, new: true }
    )

    const scoreDoc = await TrendScore.findOneAndUpdate(
      { storeId: input.storeId, trendSignalId: String(signal._id) },
      {
        storeId: input.storeId,
        brandId: input.brandId || undefined,
        trendSignalId: String(signal._id),
        niche: item.signal.niche,
        score: item.score,
        components: item.components,
        weights: item.weights,
        commercialPotential: item.commercialPotential,
        originalityPotential: item.originalityPotential,
        ipRisk: item.ipRisk,
        safetyRisk: item.safetyRisk,
        designability: item.designability,
        estimatedMargin: item.estimatedMargin,
        riskFlags: item.riskFlags,
        rationale: item.explanation,
        safetyBypassAllowed: false,
        status: 'accepted',
        scoredAt: new Date(),
      },
      { upsert: true, new: true }
    ).exec()

    out.push({
      signalId: String(signal._id),
      scoreId: String(scoreDoc!._id),
      title: item.signal.title,
      niche: item.signal.niche,
      score: item.score,
    })
  }

  logger.info('trends_persisted', { count: out.length })
  return out
}
