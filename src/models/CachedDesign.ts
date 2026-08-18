import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { NICHE_ENUM } from '@/lib/niches'

/**
 * Cached AI design assets — avoids re-calling Gemini for the same slogan/concept.
 * Image bytes live in Mongo so previews survive serverless cold starts.
 */
const cachedDesignSchema = new Schema(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    niche: {
      type: String,
      enum: NICHE_ENUM,
      required: true,
      index: true,
    },
    slogan: { type: String, required: true, index: true },
    concept: { type: String, default: '' },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    prompt: { type: String, required: true },
    negativePrompt: { type: String, default: '' },
    promptVersion: { type: String, required: true, index: true },
    mimeType: { type: String, default: 'image/png' },
    width: { type: Number, default: 1024 },
    height: { type: Number, default: 1024 },
    /** PNG/JPEG bytes */
    imageBytes: { type: Buffer, required: true },
    qualityScore: { type: Number, min: 0, max: 100, default: null },
    ipRisk: { type: Number, min: 0, max: 100, default: null },
    safetyScore: { type: Number, min: 0, max: 100, default: null },
    imageReviewDecision: {
      type: String,
      enum: ['PASS', 'REVIEW', 'REJECT'],
      default: 'REVIEW',
    },
    status: {
      type: String,
      enum: ['generated', 'review', 'approved', 'rejected'],
      default: 'review',
      index: true,
    },
    hitCount: { type: Number, default: 0, min: 0 },
    lastHitAt: { type: Date, default: null },
  },
  { timestamps: true }
)

cachedDesignSchema.index({ niche: 1, slogan: 1, promptVersion: 1 })
cachedDesignSchema.index({ createdAt: -1 })

export type CachedDesignDoc = InferSchemaType<typeof cachedDesignSchema> & {
  _id: Schema.Types.ObjectId
}

export const CachedDesign: Model<CachedDesignDoc> =
  (models.CachedDesign as Model<CachedDesignDoc>) ||
  model<CachedDesignDoc>('CachedDesign', cachedDesignSchema)
