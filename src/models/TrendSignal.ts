import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const trendSignalSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    niche: {
      type: String,
      enum: ['gaming', 'baseball', 'softball'],
      required: true,
      index: true,
    },
    source: { type: String, required: true },
    externalId: { type: String, default: '' },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    keywords: { type: [String], default: [] },
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['new', 'scored', 'discarded', 'used'],
      default: 'new',
      index: true,
    },
    observedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
)

trendSignalSchema.index({ createdAt: -1 })
trendSignalSchema.index({ storeId: 1, status: 1, createdAt: -1 })
trendSignalSchema.index({ source: 1, externalId: 1 })

export type TrendSignalDoc = InferSchemaType<typeof trendSignalSchema> & {
  _id: Schema.Types.ObjectId
}

export const TrendSignal: Model<TrendSignalDoc> =
  (models.TrendSignal as Model<TrendSignalDoc>) ||
  model<TrendSignalDoc>('TrendSignal', trendSignalSchema)
