import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'

const automationJobStateSchema = new Schema(
  {
    jobName: { type: String, required: true, unique: true, index: true },
    paused: { type: Boolean, default: false, index: true },
    lastRunId: { type: String, default: null },
    lastStatus: { type: String, default: null },
    lastFinishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export type AutomationJobStateDoc = InferSchemaType<typeof automationJobStateSchema> & {
  _id: Schema.Types.ObjectId
}

export const AutomationJobStateModel: Model<AutomationJobStateDoc> =
  (models.AutomationJobState as Model<AutomationJobStateDoc>) ||
  model<AutomationJobStateDoc>('AutomationJobState', automationJobStateSchema)
