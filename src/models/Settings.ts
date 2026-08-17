import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const settingsSchema = new Schema(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    key: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    description: { type: String, default: '' },
  },
  { timestamps: true }
)

settingsSchema.index({ createdAt: -1 })
settingsSchema.index({ storeId: 1, brandId: 1, key: 1 }, { unique: true })

export type SettingsDoc = InferSchemaType<typeof settingsSchema> & { _id: Schema.Types.ObjectId }

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) || model<SettingsDoc>('Settings', settingsSchema)
