import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { provenanceSchema } from '@/models/provenance'

const ideaSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    niche: {
      type: String,
      enum: ['gaming', 'baseball', 'softball'],
      required: true,
    },
    slogan: { type: String, required: true, trim: true },
    concept: { type: String, default: '' },
    productTypes: { type: [String], default: ['tshirt'] },
    status: {
      type: String,
      enum: ['draft', 'awaiting_approval', 'approved', 'rejected', 'used'],
      default: 'draft',
      index: true,
    },
    provenance: { type: provenanceSchema, required: true },
  },
  { timestamps: true }
)

ideaSchema.index({ createdAt: -1 })
ideaSchema.index({ storeId: 1, brandId: 1, status: 1 })

export type IdeaDoc = InferSchemaType<typeof ideaSchema> & { _id: Schema.Types.ObjectId }

export const Idea: Model<IdeaDoc> =
  (models.Idea as Model<IdeaDoc>) || model<IdeaDoc>('Idea', ideaSchema)
