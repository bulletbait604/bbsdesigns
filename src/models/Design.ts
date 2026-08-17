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
    assetKey: { type: String, required: true },
    assetUrl: { type: String, default: '' },
    mockupKeys: { type: [String], default: [] },
    qualityScore: { type: Number, min: 0, max: 100, default: null },
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
