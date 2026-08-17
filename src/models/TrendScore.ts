import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

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
      enum: ['gaming', 'baseball', 'softball'],
      required: true,
    },
    score: { type: Number, required: true, min: 0, max: 100, index: true },
    commercialPotential: { type: Number, min: 0, max: 100, default: 0 },
    originalityPotential: { type: Number, min: 0, max: 100, default: 0 },
    riskFlags: { type: [String], default: [] },
    rationale: { type: String, default: '' },
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
