import { Syne, IBM_Plex_Sans } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'

const display = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
})

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'bbsdesigns · AI Merch Factory',
  description: 'Operator dashboard for original gaming, baseball, and softball humor merch.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
