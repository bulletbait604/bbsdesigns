import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function AutomationPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/automation"
      title="Automation"
      subtitle="Scheduled runs for trends, scoring, and queue processing."
      bullets={['Idempotency keys on every run', 'Manual trigger support', 'Skipped while keys are missing']}
    />
  )
}
