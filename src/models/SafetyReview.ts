import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const safetyReviewSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    targetType: {
      type: String,
      enum: ['idea', 'design', 'product', 'slogan', 'text'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, default: null, index: true },
    inputText: { type: String, default: '' },
    decision: {
      type: String,
      enum: ['PASS', 'REVIEW', 'REJECT'],
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    ipRisk: { type: Number, min: 0, max: 100, default: 0 },
    safetyRisk: { type: Number, min: 0, max: 100, default: 0 },
    reasons: { type: [String], default: [] },
    rulesTriggered: { type: [String], default: [] },
    ipRiskFlags: { type: [String], default: [] },
    tosRiskFlags: { type: [String], default: [] },
    stages: { type: Schema.Types.Mixed, default: [] },
    reviewer: { type: String, default: 'system' },
    modelProvider: { type: String, default: '' },
    modelName: { type: String, default: '' },
    modelResponse: { type: String, default: '' },
    policyVersion: { type: String, required: true, index: true },
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
