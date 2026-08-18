import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { provenanceSchema } from '@/models/provenance'
import { NICHE_ENUM } from '@/lib/niches'

const productSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    ideaId: { type: Schema.Types.ObjectId, ref: 'Idea', required: true, index: true },
    designId: { type: Schema.Types.ObjectId, ref: 'Design', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    niche: {
      type: String,
      enum: NICHE_ENUM,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'draft_idea',
        'awaiting_approval',
        'approved',
        'rejected',
        'shopify_draft',
        'published',
        'retired',
      ],
      default: 'awaiting_approval',
      index: true,
    },
    shopifyProductId: { type: String, default: null, index: true },
    printifyProductId: { type: String, default: null, index: true },
    tags: { type: [String], default: [] },
    provenance: { type: provenanceSchema, required: true },
  },
  { timestamps: true }
)

productSchema.index({ createdAt: -1 })
productSchema.index({ storeId: 1, status: 1, createdAt: -1 })
productSchema.index({ 'provenance.publishStatus': 1 })

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: Schema.Types.ObjectId }

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) || model<ProductDoc>('Product', productSchema)
