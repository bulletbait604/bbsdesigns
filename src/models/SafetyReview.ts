import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const safetyReviewSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    targetType: {
      type: String,
      enum: ['idea', 'design', 'product'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    decision: {
      type: String,
      enum: ['PASS', 'REVIEW', 'REJECT'],
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    reasons: { type: [String], default: [] },
    ipRiskFlags: { type: [String], default: [] },
    tosRiskFlags: { type: [String], default: [] },
    reviewer: { type: String, default: 'system' },
    modelProvider: { type: String, default: '' },
    promptVersion: { type: String, default: '' },
    status: {
      type: String,
      enum: ['complete', 'overridden', 'superseded'],
      default: 'complete',
      index: true,
    },
  },
  { timestamps: true }
)

safetyReviewSchema.index({ createdAt: -1 })
safetyReviewSchema.index({ storeId: 1, decision: 1, createdAt: -1 })

export type SafetyReviewDoc = InferSchemaType<typeof safetyReviewSchema> & {
  _id: Schema.Types.ObjectId
}

export const SafetyReview: Model<SafetyReviewDoc> =
  (models.SafetyReview as Model<SafetyReviewDoc>) ||
  model<SafetyReviewDoc>('SafetyReview', safetyReviewSchema)
