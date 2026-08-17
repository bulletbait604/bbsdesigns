import { getEnv } from '@/lib/env'

export type FeatureFlags = {
  humanApproval: boolean
  autoPublish: boolean
}

export function getFeatureFlags(): FeatureFlags {
  const env = getEnv()
  return {
    humanApproval: env.HUMAN_APPROVAL,
    // Hard gate: never auto-publish while human approval is required.
    autoPublish: env.AUTO_PUBLISH && !env.HUMAN_APPROVAL,
  }
}
