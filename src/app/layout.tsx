import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Merch Factory',
  description: 'Shopify-first AI print-on-demand automation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
