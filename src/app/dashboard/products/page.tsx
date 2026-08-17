import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function ProductsPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/products"
      title="Products"
      subtitle="Catalog records linked to Shopify drafts and Printify SKUs."
      bullets={[
        'Created as DRAFT by default',
        'Requires PASS safety + valid media/variants/price',
        'Shopify GraphQL Admin API only — no legacy REST create',
      ]}
    />
  )
}
