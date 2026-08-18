import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const adminAuthSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSetAt: { type: Date, required: true },
    failedAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    lastFailedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type AdminAuthDoc = InferSchemaType<typeof adminAuthSchema> & {
  _id: Schema.Types.ObjectId
}

export const AdminAuth: Model<AdminAuthDoc> =
  (models.AdminAuth as Model<AdminAuthDoc>) || model<AdminAuthDoc>('AdminAuth', adminAuthSchema)
