import type { DemoDesign } from '@/lib/demoCatalog'
import type { Niche } from '@/types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function splitSlogan(slogan: string): string[] {
  const parts = slogan.split(/(?<=\.)\s+|\n/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) return parts.slice(0, 3)
  const words = slogan.split(/\s+/)
  if (words.length <= 3) return [slogan]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

const NICHE_PALETTE: Record<
  Niche,
  { bg: string; ink: string; accent: string; shirt: string }
> = {
  gaming: { bg: '#0b1220', ink: '#f4f7fb', accent: '#5eead4', shirt: '#1e293b' },
  baseball: { bg: '#102018', ink: '#f8fafc', accent: '#86efac', shirt: '#14532d' },
  softball: { bg: '#1a1420', ink: '#fdf4ff', accent: '#f0abfc', shirt: '#3b0764' },
}

/** Build a DemoDesign-shaped object for live SVG previews (non-catalog). */
export function buildLiveMerchDesign(input: {
  slogan: string
  niche: Niche
  title?: string
}): DemoDesign {
  return {
    id: 'lag-lifestyle',
    ideaId: 'live',
    niche: input.niche,
    title: input.title || input.slogan,
    slogan: input.slogan,
    style: 'Live SVG preview',
    mockupLabel: 'Black tee · front print',
    qualityScore: 70,
    ipRisk: 5,
    safetyDecision: 'PASS',
    status: 'review',
    palette: NICHE_PALETTE[input.niche],
  }
}

/** Print-ready artwork SVG for dashboard preview. */
export function buildArtworkSvg(design: DemoDesign): string {
  const lines = splitSlogan(design.slogan).map(escapeXml)
  const { bg, ink, accent } = design.palette
  const lineHeight = 88
  const startY = 520 - ((lines.length - 1) * lineHeight) / 2

  const textNodes = lines
    .map(
      (line, i) =>
        `<text x="512" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="${lines.length > 2 ? 54 : 68}" font-weight="800" fill="${ink}">${line}</text>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <circle cx="180" cy="160" r="120" fill="${accent}" opacity="0.12"/>
  <circle cx="860" cy="880" r="160" fill="${accent}" opacity="0.1"/>
  <rect x="120" y="120" width="784" height="784" rx="28" fill="none" stroke="${accent}" stroke-width="4" opacity="0.35"/>
  <text x="512" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" letter-spacing="6" fill="${accent}" opacity="0.9">${escapeXml(design.niche.toUpperCase())}</text>
  ${textNodes}
  <text x="512" y="860" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${ink}" opacity="0.45">bbsdesigns · original artwork preview</text>
</svg>`
}

/** Apparel mockup SVG with artwork placed on a tee silhouette. */
export function buildMockupSvg(design: DemoDesign): string {
  const lines = splitSlogan(design.slogan).map(escapeXml)
  const { accent, shirt, ink } = design.palette
  const lineHeight = 36
  const startY = 430 - ((lines.length - 1) * lineHeight) / 2

  const printText = lines
    .map(
      (line, i) =>
        `<text x="400" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="${lines.length > 2 ? 22 : 28}" font-weight="800" fill="${ink}">${line}</text>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111f"/>
      <stop offset="100%" stop-color="#10233b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="900" fill="url(#bg)"/>
  <!-- tee body -->
  <path d="M250 180 L170 250 L220 300 L250 280 L250 780 Q250 820 300 820 L500 820 Q550 820 550 780 L550 280 L580 300 L630 250 L550 180 Q500 150 400 150 Q300 150 250 180 Z"
        fill="${shirt}" stroke="${accent}" stroke-width="3" opacity="0.95"/>
  <!-- collar -->
  <ellipse cx="400" cy="190" rx="48" ry="28" fill="#07111f" opacity="0.55"/>
  <!-- print area -->
  <rect x="290" y="340" width="220" height="220" rx="12" fill="#07111f" opacity="0.35"/>
  ${printText}
  <text x="400" y="860" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${accent}">${escapeXml(design.mockupLabel)}</text>
</svg>`
}
