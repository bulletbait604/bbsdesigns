import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function IdeasPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/ideas"
      title="Ideas"
      subtitle="Slogan concepts waiting for safety and design."
      bullets={[
        'Original gaming / baseball / softball humor only',
        'Every idea keeps trend + prompt provenance',
        'Slogan engine arrives in prompt 007',
      ]}
    />
  )
}
