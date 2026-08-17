import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const salesMetricSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    period: {
      type: String,
      enum: ['day', 'week', 'month'],
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true, index: true },
    unitsSold: { type: Number, default: 0, min: 0 },
    revenueCents: { type: Number, default: 0, min: 0 },
    refundCents: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'stale'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
)

salesMetricSchema.index({ createdAt: -1 })
salesMetricSchema.index(
  { storeId: 1, productId: 1, period: 1, periodStart: 1 },
  { unique: true }
)

export type SalesMetricDoc = InferSchemaType<typeof salesMetricSchema> & {
  _id: Schema.Types.ObjectId
}

export const SalesMetric: Model<SalesMetricDoc> =
  (models.SalesMetric as Model<SalesMetricDoc>) ||
  model<SalesMetricDoc>('SalesMetric', salesMetricSchema)
