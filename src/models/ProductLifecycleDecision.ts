import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const productLifecycleDecisionSchema = new Schema(
  {
    productKey: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    title: { type: String, required: true },
    decision: {
      type: String,
      enum: ['KEEP', 'OPTIMIZE', 'RETIRE_CANDIDATE'],
      required: true,
      index: true,
    },
    reasons: { type: [String], default: [] },
    /** Advisory only — never auto-deletes products */
    autoApplied: { type: Boolean, default: false },
    metricsSnapshot: { type: Schema.Types.Mixed, default: {} },
    weekStart: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

productLifecycleDecisionSchema.index({ productKey: 1, weekStart: 1 }, { unique: true })
productLifecycleDecisionSchema.index({ createdAt: -1 })

export type ProductLifecycleDecisionDoc = InferSchemaType<
  typeof productLifecycleDecisionSchema
> & {
  _id: Schema.Types.ObjectId
}

export const ProductLifecycleDecision: Model<ProductLifecycleDecisionDoc> =
  (models.ProductLifecycleDecision as Model<ProductLifecycleDecisionDoc>) ||
  model<ProductLifecycleDecisionDoc>('ProductLifecycleDecision', productLifecycleDecisionSchema)
