import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const productVariantSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, trim: true },
    title: { type: String, required: true },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    priceCents: { type: Number, required: true, min: 0 },
    costCents: { type: Number, default: 0, min: 0 },
    shopifyVariantId: { type: String, default: null },
    printifyVariantId: { type: String, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'retired'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
)

productVariantSchema.index({ createdAt: -1 })
productVariantSchema.index({ storeId: 1, productId: 1 })
productVariantSchema.index({ sku: 1 }, { unique: true })

export type ProductVariantDoc = InferSchemaType<typeof productVariantSchema> & {
  _id: Schema.Types.ObjectId
}

export const ProductVariant: Model<ProductVariantDoc> =
  (models.ProductVariant as Model<ProductVariantDoc>) ||
  model<ProductVariantDoc>('ProductVariant', productVariantSchema)
