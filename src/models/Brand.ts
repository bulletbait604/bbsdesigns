import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { NICHE_ENUM } from '@/lib/niches'

const brandSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    niches: {
      type: [
        {
          type: String,
          enum: NICHE_ENUM,
        },
      ],
      default: [...NICHE_ENUM],
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'archived'],
      default: 'active',
      index: true,
    },
    voice: { type: String, default: 'funny, sarcastic, cheeky' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

brandSchema.index({ storeId: 1, slug: 1 }, { unique: true })
brandSchema.index({ createdAt: -1 })

export type BrandDoc = InferSchemaType<typeof brandSchema> & { _id: Schema.Types.ObjectId }

export const Brand: Model<BrandDoc> =
  (models.Brand as Model<BrandDoc>) || model<BrandDoc>('Brand', brandSchema)
