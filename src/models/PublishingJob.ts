import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const publishingJobSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true },
    stage: {
      type: String,
      enum: ['approve', 'shopify_draft', 'printify_sync', 'publish', 'retire'],
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled', 'awaiting_approval'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    lastError: { type: String, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    scheduledAt: { type: Date, default: Date.now, index: true },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

publishingJobSchema.index({ createdAt: -1 })
publishingJobSchema.index({ storeId: 1, status: 1, scheduledAt: 1 })
publishingJobSchema.index({ status: 1, scheduledAt: 1 })

export type PublishingJobDoc = InferSchemaType<typeof publishingJobSchema> & {
  _id: Schema.Types.ObjectId
}

export const PublishingJob: Model<PublishingJobDoc> =
  (models.PublishingJob as Model<PublishingJobDoc>) ||
  model<PublishingJobDoc>('PublishingJob', publishingJobSchema)
