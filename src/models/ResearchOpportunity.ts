import { Schema, models, model, type InferSchemaType, type Model } from 'mongoose'
import { NICHE_ENUM } from '@/lib/niches'

const researchOpportunitySchema = new Schema(
  {
    opportunityId: { type: String, required: true, unique: true, index: true },
    topic: { type: String, required: true },
    niche: { type: String, enum: NICHE_ENUM, required: true, index: true },
    sources: { type: [String], default: [] },
    opportunityScore: { type: Number, min: 0, max: 100, required: true, index: true },
    scores: { type: Schema.Types.Mixed, required: true },
    records: { type: [Schema.Types.Mixed], default: [] },
    cluster: { type: Schema.Types.Mixed, default: null },
    topConcepts: { type: [Schema.Types.Mixed], default: [] },
    productTypesRecommended: { type: [String], default: [] },
    engineVersion: { type: String, required: true },
    status: {
      type: String,
      enum: ['researched', 'concepted', 'designing', 'approved', 'rejected', 'retired'],
      default: 'researched',
      index: true,
    },
  },
  { timestamps: true }
)

researchOpportunitySchema.index({ createdAt: -1 })
researchOpportunitySchema.index({ niche: 1, opportunityScore: -1 })

export type ResearchOpportunityDoc = InferSchemaType<typeof researchOpportunitySchema> & {
  _id: Schema.Types.ObjectId
}

export const ResearchOpportunityModel: Model<ResearchOpportunityDoc> =
  (models.ResearchOpportunity as Model<ResearchOpportunityDoc>) ||
  model<ResearchOpportunityDoc>('ResearchOpportunity', researchOpportunitySchema)
