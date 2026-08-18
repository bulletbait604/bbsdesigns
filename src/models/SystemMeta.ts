import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose'

const systemMetaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
)

export type SystemMetaDoc = InferSchemaType<typeof systemMetaSchema> & {
  _id: Schema.Types.ObjectId
}

export const SystemMeta: Model<SystemMetaDoc> =
  (models.SystemMeta as Model<SystemMetaDoc>) ||
  model<SystemMetaDoc>('SystemMeta', systemMetaSchema)
