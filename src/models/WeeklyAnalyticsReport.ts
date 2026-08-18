import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const weeklyAnalyticsReportSchema = new Schema(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    weekStart: { type: Date, required: true, index: true },
    weekEnd: { type: Date, required: true },
    generatedAt: { type: Date, required: true },
    totals: { type: Schema.Types.Mixed, required: true },
    byDecision: { type: Schema.Types.Mixed, required: true },
    trafficBySource: { type: Schema.Types.Mixed, default: {} },
    summary: { type: String, required: true },
    productCount: { type: Number, default: 0, min: 0 },
    /** Full product rows from stored metrics only */
    products: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

weeklyAnalyticsReportSchema.index({ weekStart: -1 })
weeklyAnalyticsReportSchema.index({ createdAt: -1 })

export type WeeklyAnalyticsReportDoc = InferSchemaType<typeof weeklyAnalyticsReportSchema> & {
  _id: Schema.Types.ObjectId
}

export const WeeklyAnalyticsReport: Model<WeeklyAnalyticsReportDoc> =
  (models.WeeklyAnalyticsReport as Model<WeeklyAnalyticsReportDoc>) ||
  model<WeeklyAnalyticsReportDoc>('WeeklyAnalyticsReport', weeklyAnalyticsReportSchema)
