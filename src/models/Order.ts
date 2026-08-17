import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const orderSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    shopifyOrderId: { type: String, required: true, unique: true },
    printifyOrderId: { type: String, default: null },
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'cancelled', 'refunded'],
      default: 'open',
      index: true,
    },
    totalCents: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD' },
    lineItems: { type: [Schema.Types.Mixed], default: [] },
    orderedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
)

orderSchema.index({ createdAt: -1 })
orderSchema.index({ storeId: 1, status: 1, orderedAt: -1 })

export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: Schema.Types.ObjectId }

export const Order: Model<OrderDoc> =
  (models.Order as Model<OrderDoc>) || model<OrderDoc>('Order', orderSchema)
