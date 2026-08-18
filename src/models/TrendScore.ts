import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { NICHE_ENUM } from '@/lib/niches'

const scoreComponentsSchema = new Schema(
  {
    virality: { type: Number, min: 0, max: 100, required: true },
    growth: { type: Number, min: 0, max: 100, required: true },
    commercialIntent: { type: Number, min: 0, max: 100, required: true },
    audienceFit: { type: Number, min: 0, max: 100, required: true },
    seasonality: { type: Number, min: 0, max: 100, required: true },
    evergreenPotential: { type: Number, min: 0, max: 100, required: true },
    competition: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false }
)

const trendScoreSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    trendSignalId: {
      type: Schema.Types.ObjectId,
      ref: 'TrendSignal',
      required: true,
      index: true,
    },
    niche: {
      type: String,
      enum: NICHE_ENUM,
      required: true,
    },
    score: { type: Number, required: true, min: 0, max: 100, index: true },
    components: { type: scoreComponentsSchema, required: true },
    weights: { type: Schema.Types.Mixed, required: true },
    commercialPotential: { type: Number, min: 0, max: 100, default: 0 },
    originalityPotential: { type: Number, min: 0, max: 100, default: 0 },
    ipRisk: { type: Number, min: 0, max: 100, default: 0 },
    safetyRisk: { type: Number, min: 0, max: 100, default: 0 },
    designability: { type: Number, min: 0, max: 100, default: 0 },
    estimatedMargin: { type: Number, min: 0, max: 100, default: 0 },
    riskFlags: { type: [String], default: [] },
    rationale: { type: String, default: '' },
    /** High commercial score never overrides safety — always false until safety PASSes. */
    safetyBypassAllowed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    scoredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

trendScoreSchema.index({ createdAt: -1 })
trendScoreSchema.index({ storeId: 1, score: -1 })
trendScoreSchema.index({ score: -1, status: 1 })

export type TrendScoreDoc = InferSchemaType<typeof trendScoreSchema> & {
  _id: Schema.Types.ObjectId
}

export const TrendScore: Model<TrendScoreDoc> =
  (models.TrendScore as Model<TrendScoreDoc>) || model<TrendScoreDoc>('TrendScore', trendScoreSchema)
