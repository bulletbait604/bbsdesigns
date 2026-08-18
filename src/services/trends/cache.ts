import { createHash } from 'crypto'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { CachedTrendBatch } from '@/models/CachedTrendBatch'
import { logger } from '@/lib/logger'
import type { Niche } from '@/types'
import type { TrendSignalDto } from '@/providers/types'

const DEFAULT_TTL_HOURS = 12

function dayBucket(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export function buildTrendCacheKey(niche: Niche, source: string, bucket = dayBucket()): string {
  return createHash('sha256').update(`${source}|${niche}|${bucket}`).digest('hex').slice(0, 32)
}

export async function findCachedTrendSignals(
  niche: Niche,
  source: string
): Promise<TrendSignalDto[] | null> {
  if (!isMongoConfigured()) return null
  await connectMongo()

  const cacheKey = buildTrendCacheKey(niche, source)
  const doc = await CachedTrendBatch.findOneAndUpdate(
    { cacheKey, expiresAt: { $gt: new Date() } },
    { $inc: { hitCount: 1 } },
    { new: true }
  ).lean()

  if (!doc?.signals?.length) return null
  logger.info('trend_cache_hit', { niche, source, count: doc.signals.length })
  return doc.signals as TrendSignalDto[]
}

export async function saveCachedTrendSignals(
  niche: Niche,
  source: string,
  signals: TrendSignalDto[],
  ttlHours = DEFAULT_TTL_HOURS
): Promise<void> {
  if (!isMongoConfigured() || !signals.length) return
  await connectMongo()

  const bucket = dayBucket()
  const cacheKey = buildTrendCacheKey(niche, source, bucket)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

  await CachedTrendBatch.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      niche,
      source,
      dayBucket: bucket,
      signals,
      expiresAt,
      hitCount: 0,
    },
    { upsert: true, new: true }
  )

  logger.info('trend_cache_saved', { niche, source, count: signals.length, expiresAt })
}
