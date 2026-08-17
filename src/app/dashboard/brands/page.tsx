import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function BrandsPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/brands"
      title="Brands"
      subtitle="Brand voice and niche focus under each store."
      bullets={[
        'Niches: gaming · baseball · softball',
        'Voice: funny, sarcastic, cheeky',
        'No explicit sexual content, hate, or IP imitation',
      ]}
    />
  )
}
