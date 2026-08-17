import { PlaceholderPanel } from '@/components/dashboard/PlaceholderPanel'

export default function AnalyticsPage() {
  return (
    <PlaceholderPanel
      activePath="/dashboard/analytics"
      title="Analytics"
      subtitle="What to keep, improve, or retire."
      bullets={['Units, revenue, refunds by product', 'Niche performance', 'Retirement engine later']}
    />
  )
}
