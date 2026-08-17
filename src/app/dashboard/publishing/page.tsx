import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function PublishingPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/publishing"
      title="Publishing Queue"
      subtitle="Idempotent jobs for draft → Printify sync → optional publish."
      bullets={[
        'AUTO_PUBLISH remains false in development',
        'Retries use exponential backoff',
        'Audit trail on every action',
      ]}
    />
  )
}
