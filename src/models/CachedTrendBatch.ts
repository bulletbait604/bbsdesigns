import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { NICHE_ENUM } from '@/lib/niches'

/**
 * Cached trend research batches — reduces SerpAPI / Etsy calls for the same niche/day.
 */
const cachedTrendBatchSchema = new Schema(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    niche: {
      type: String,
      enum: NICHE_ENUM,
      required: true,
      index: true,
    },
    source: { type: String, required: true, index: true },
    dayBucket: { type: String, required: true, index: true },
    signals: { type: [Schema.Types.Mixed], default: [] },
    hitCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

cachedTrendBatchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export type CachedTrendBatchDoc = InferSchemaType<typeof cachedTrendBatchSchema> & {
  _id: Schema.Types.ObjectId
}

export const CachedTrendBatch: Model<CachedTrendBatchDoc> =
  (models.CachedTrendBatch as Model<CachedTrendBatchDoc>) ||
  model<CachedTrendBatchDoc>('CachedTrendBatch', cachedTrendBatchSchema)
