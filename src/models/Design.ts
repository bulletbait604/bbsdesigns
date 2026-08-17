import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { provenanceSchema } from '@/models/provenance'

const designSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    ideaId: { type: Schema.Types.ObjectId, ref: 'Idea', required: true, index: true },
    niche: {
      type: String,
      enum: ['gaming', 'baseball', 'softball'],
      required: true,
    },
    title: { type: String, required: true },
    slogan: { type: String, default: '' },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    prompt: { type: String, required: true },
    negativePrompt: { type: String, default: '' },
    promptVersion: { type: String, required: true },
    assetKey: { type: String, required: true },
    assetUrl: { type: String, default: '' },
    mimeType: { type: String, default: 'image/png' },
    width: { type: Number, default: 2048 },
    height: { type: Number, default: 2048 },
    mockupKeys: { type: [String], default: [] },
    qualityScore: { type: Number, min: 0, max: 100, default: null },
    ipRisk: { type: Number, min: 0, max: 100, default: null },
    safetyScore: { type: Number, min: 0, max: 100, default: null },
    imageReviewDecision: {
      type: String,
      enum: ['PASS', 'REVIEW', 'REJECT'],
      default: undefined,
    },
    status: {
      type: String,
      enum: ['generated', 'review', 'approved', 'rejected', 'retired'],
      default: 'generated',
      index: true,
    },
    provenance: { type: provenanceSchema, required: true },
  },
  { timestamps: true }
)

designSchema.index({ createdAt: -1 })
designSchema.index({ storeId: 1, status: 1, createdAt: -1 })

export type DesignDoc = InferSchemaType<typeof designSchema> & { _id: Schema.Types.ObjectId }

export const Design: Model<DesignDoc> =
  (models.Design as Model<DesignDoc>) || model<DesignDoc>('Design', designSchema)
