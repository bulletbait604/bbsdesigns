import { Schema, type InferSchemaType } from 'mongoose'

/** Provenance required on every generated asset / product lineage. */
export const provenanceSchema = new Schema(
  {
    sourceTrendIds: { type: [String], default: [] },
    ideaId: { type: String, default: null },
    sloganId: { type: String, default: null },
    promptVersion: { type: String, required: true },
    modelProvider: { type: String, required: true },
    modelName: { type: String, default: '' },
    imageAssetKey: { type: String, default: null },
    safetyReviewId: { type: String, default: null },
    qualityScore: { type: Number, min: 0, max: 100, default: null },
    safetyScore: { type: Number, min: 0, max: 100, default: null },
    safetyDecision: {
      type: String,
      enum: ['PASS', 'REVIEW', 'REJECT'],
      default: undefined,
    },
    publishStatus: {
      type: String,
      enum: [
        'draft_idea',
        'awaiting_approval',
        'approved',
        'rejected',
        'shopify_draft',
        'published',
        'retired',
      ],
      default: 'draft_idea',
      index: true,
    },
  },
  { _id: false }
)

export type Provenance = InferSchemaType<typeof provenanceSchema>
