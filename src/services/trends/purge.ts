import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Design } from '@/models/Design'
import { CachedDesign } from '@/models/CachedDesign'
import { CachedTrendBatch } from '@/models/CachedTrendBatch'
import { TrendSignal } from '@/models/TrendSignal'
import { TrendScore } from '@/models/TrendScore'
import { Idea } from '@/models/Idea'
import { Product } from '@/models/Product'
import { ProductVariant } from '@/models/ProductVariant'
import { SystemMeta } from '@/models/SystemMeta'
import { VIRAL_ALGORITHM_VERSION } from '@/services/trends/viralAlgorithm'
import { DESIGN_PROMPT_VERSION } from '@/services/designs/types'
import { logger } from '@/lib/logger'

export type ViralPurgeCounts = {
  designs: number
  cachedDesigns: number
  cachedTrendBatches: number
  trendSignals: number
  trendScores: number
  ideas: number
  products: number
  productVariants: number
}

/**
 * Erase saved designs + viral-research algorithm state so the pipeline
 * regenerates under VIRAL_ALGORITHM_VERSION / flash merch prompts.
 */
export async function purgeViralCreativeState(): Promise<ViralPurgeCounts> {
  await connectMongo()

  const [
    designs,
    cachedDesigns,
    cachedTrendBatches,
    trendSignals,
    trendScores,
    ideas,
    products,
    productVariants,
  ] = await Promise.all([
    Design.deleteMany({}),
    CachedDesign.deleteMany({}),
    CachedTrendBatch.deleteMany({}),
    TrendSignal.deleteMany({}),
    TrendScore.deleteMany({}),
    Idea.deleteMany({}),
    Product.deleteMany({}),
    ProductVariant.deleteMany({}),
  ])

  const counts: ViralPurgeCounts = {
    designs: designs.deletedCount ?? 0,
    cachedDesigns: cachedDesigns.deletedCount ?? 0,
    cachedTrendBatches: cachedTrendBatches.deletedCount ?? 0,
    trendSignals: trendSignals.deletedCount ?? 0,
    trendScores: trendScores.deletedCount ?? 0,
    ideas: ideas.deletedCount ?? 0,
    products: products.deletedCount ?? 0,
    productVariants: productVariants.deletedCount ?? 0,
  }

  await SystemMeta.findOneAndUpdate(
    { key: 'viral_algorithm_version' },
    { $set: { value: `${VIRAL_ALGORITHM_VERSION}|${DESIGN_PROMPT_VERSION}` } },
    { upsert: true }
  )
  await SystemMeta.findOneAndUpdate(
    { key: 'design_prompt_version' },
    { $set: { value: DESIGN_PROMPT_VERSION } },
    { upsert: true }
  )

  logger.info('viral_creative_state_purged', {
    algorithm: VIRAL_ALGORITHM_VERSION,
    designPrompt: DESIGN_PROMPT_VERSION,
    ...counts,
  })

  return counts
}

/**
 * On algorithm version bump (or first boot), wipe legacy design/trend state once.
 */
export async function ensureViralAlgorithmMigration(): Promise<{
  skipped?: boolean
  purged: boolean
  counts?: ViralPurgeCounts
  algorithmVersion: string
}> {
  if (!isMongoConfigured()) {
    return { skipped: true, purged: false, algorithmVersion: VIRAL_ALGORITHM_VERSION }
  }

  await connectMongo()
  const meta = await SystemMeta.findOne({ key: 'viral_algorithm_version' }).lean()
  const expected = `${VIRAL_ALGORITHM_VERSION}|${DESIGN_PROMPT_VERSION}`
  if (meta?.value === expected) {
    return { purged: false, algorithmVersion: VIRAL_ALGORITHM_VERSION }
  }

  const counts = await purgeViralCreativeState()
  return { purged: true, counts, algorithmVersion: VIRAL_ALGORITHM_VERSION }
}
