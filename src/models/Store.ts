import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const storeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shopifyDomain: { type: String, required: true, unique: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ['active', 'paused', 'archived'],
      default: 'active',
      index: true,
    },
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'America/Los_Angeles' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

storeSchema.index({ createdAt: -1 })

export type StoreDoc = InferSchemaType<typeof storeSchema> & { _id: Schema.Types.ObjectId }

export const Store: Model<StoreDoc> =
  (models.Store as Model<StoreDoc>) || model<StoreDoc>('Store', storeSchema)
