import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

/** Registered external provider credentials metadata (never store raw secrets here). */
const providerSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
    kind: {
      type: String,
      enum: ['ai_text', 'image', 'trend', 'storage', 'shopify', 'printify'],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    envKeyHint: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'disabled', 'error'],
      default: 'active',
      index: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
    lastHealthCheckAt: { type: Date, default: null },
  },
  { timestamps: true }
)

providerSchema.index({ createdAt: -1 })
providerSchema.index({ kind: 1, name: 1 }, { unique: true })

export type ProviderDoc = InferSchemaType<typeof providerSchema> & { _id: Schema.Types.ObjectId }

export const Provider: Model<ProviderDoc> =
  (models.Provider as Model<ProviderDoc>) || model<ProviderDoc>('Provider', providerSchema)
