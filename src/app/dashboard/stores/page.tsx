import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function StoresPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/stores"
      title="Stores"
      subtitle="Shopify store records linked to this factory."
      bullets={['Primary store: bbsdesigns', 'Timezone + currency defaults', 'Paused/archived statuses']}
    />
  )
}
