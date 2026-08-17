import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function AuditPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/audit"
      title="Audit Logs"
      subtitle="Every approve, reject, publish, and automation action."
      bullets={['Actor + entity + timestamp', 'Structured metadata', 'Required for publishing trust']}
    />
  )
}
