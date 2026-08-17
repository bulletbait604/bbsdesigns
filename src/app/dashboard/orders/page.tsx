import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function OrdersPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/orders"
      title="Orders"
      subtitle="Shopify orders mirrored for analytics and retirement signals."
      bullets={['Read-only mirror first', 'Printify fulfillment IDs when synced', 'Feeds sales metrics']}
    />
  )
}
