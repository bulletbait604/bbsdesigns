import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function DesignsPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/designs"
      title="Designs"
      subtitle="Generated artwork and mockups for approved ideas."
      bullets={[
        'No franchise characters, logos, or celebrity likenesses',
        'Quality score gate before listing prep',
        'Image + review engines land in prompts 009–010',
      ]}
    />
  )
}
