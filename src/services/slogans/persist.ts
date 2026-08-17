import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Idea } from '@/models/Idea'
import { logger } from '@/lib/logger'
import type { SloganCandidate } from '@/services/slogans/types'

/**
 * Persist non-REJECT slogan candidates as Idea docs when Mongo is configured.
 * REJECT candidates are never written.
 */
export async function persistAcceptedSlogans(input: {
  candidates: SloganCandidate[]
  storeId: string
  brandId: string
}): Promise<string[]> {
  const accepted = input.candidates.filter(
    (c) => c.persisted && c.safety && c.safety.decision !== 'REJECT'
  )
  if (!accepted.length) return []
  if (!isMongoConfigured()) {
    logger.info('slogan_persist_skipped_no_mongo', { count: accepted.length })
    return []
  }

  await connectMongo()
  const ids: string[] = []

  for (const candidate of accepted) {
    const doc = await Idea.create({
      storeId: input.storeId,
      brandId: input.brandId,
      niche: candidate.niche,
      slogan: candidate.slogan,
      concept: candidate.concept,
      productTypes: ['tshirt'],
      status:
        candidate.safety?.decision === 'PASS' ? 'approved' : 'awaiting_approval',
      provenance: {
        sourceTrendIds: candidate.sourceTrendTitle ? [candidate.sourceTrendTitle] : [],
        promptVersion: candidate.promptVersion,
        modelProvider: candidate.safety?.provider || 'slogan-engine',
        modelName: candidate.safety?.model || '',
        qualityScore: candidate.overall,
        safetyScore: candidate.safety?.score ?? null,
        safetyDecision: candidate.safety?.decision ?? null,
        publishStatus:
          candidate.safety?.decision === 'PASS' ? 'approved' : 'awaiting_approval',
      },
    })
    ids.push(String(doc._id))
  }

  logger.info('slogan_persisted', { count: ids.length })
  return ids
}
