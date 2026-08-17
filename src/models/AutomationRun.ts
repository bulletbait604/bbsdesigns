import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const automationRunSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
    jobName: { type: String, required: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'succeeded', 'failed', 'skipped'],
      default: 'queued',
      index: true,
    },
    trigger: {
      type: String,
      enum: ['schedule', 'manual', 'webhook'],
      default: 'schedule',
    },
    summary: { type: String, default: '' },
    stats: { type: Schema.Types.Mixed, default: {} },
    error: { type: String, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

automationRunSchema.index({ createdAt: -1 })
automationRunSchema.index({ jobName: 1, status: 1, createdAt: -1 })

export type AutomationRunDoc = InferSchemaType<typeof automationRunSchema> & {
  _id: Schema.Types.ObjectId
}

export const AutomationRun: Model<AutomationRunDoc> =
  (models.AutomationRun as Model<AutomationRunDoc>) ||
  model<AutomationRunDoc>('AutomationRun', automationRunSchema)
