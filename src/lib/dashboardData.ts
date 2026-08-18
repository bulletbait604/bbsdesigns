export type NavItem = {
  href: string
  label: string
}

export const DASHBOARD_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/trends', label: 'Trends' },
  { href: '/dashboard/ideas', label: 'Ideas' },
  { href: '/dashboard/designs', label: 'Designs' },
  { href: '/dashboard/safety', label: 'Safety Queue' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/publishing', label: 'Publishing' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/automation', label: 'Automation' },
  { href: '/dashboard/stores', label: 'Stores' },
  { href: '/dashboard/brands', label: 'Brands' },
  { href: '/dashboard/providers', label: 'Providers' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/dashboard/audit', label: 'Audit Logs' },
]

export type PipelineStat = {
  label: string
  value: string
  hint: string
}

export type QueueItem = {
  id: string
  niche: 'gaming' | 'baseball' | 'softball'
  trend: string
  slogan: string
  title: string
  description: string
  tags: string[]
  trendScore: number
  safetyScore: number
  safetyDecision: 'PASS' | 'REVIEW' | 'REJECT'
  ipRisk: number
  qualityScore: number
  estimatedMargin: number
  designLabel: string
  mockupLabel: string
  status: string
  /** Links to SVG preview catalog when artwork exists */
  designPreviewId?: 'lag-lifestyle' | 'sunburnt-softball' | 'swing-bad-ideas' | 'cleats-dignity'
  /** Live preview URLs (Mongo pipeline) */
  artworkUrl?: string
  mockupUrl?: string
}

/** Demo ops data so the dashboard renders before Mongo/API wiring. */
export const DEMO_STATS: PipelineStat[] = [
  { label: 'Awaiting approval', value: '3', hint: 'Human gate is on' },
  { label: 'Shopify drafts', value: '0', hint: 'No live publish yet' },
  { label: 'Safety rejects', value: '1', hint: 'REJECT always wins' },
  { label: 'Trend score avg', value: '81', hint: 'Not a sales guarantee' },
]

export const DEMO_APPROVALS: QueueItem[] = [
  {
    id: 'appr-001',
    niche: 'softball',
    trend: 'Funny Beer League Softball',
    slogan: 'Sunburnt. Competitive. Still here.',
    title: 'Sunburnt Competitive Still Here Tee',
    description:
      'Original beer-league softball humor for dugout crews who take pizza more seriously than standings.',
    tags: ['softball', 'beer-league', 'humor', 'adult'],
    trendScore: 89,
    safetyScore: 94,
    safetyDecision: 'PASS',
    ipRisk: 2,
    qualityScore: 88,
    estimatedMargin: 78,
    designLabel: 'Type-led dugout mark',
    mockupLabel: 'Black tee · front print',
    status: 'awaiting_approval',
    designPreviewId: 'sunburnt-softball',
  },
  {
    id: 'appr-002',
    niche: 'gaming',
    trend: 'Lag is a Lifestyle',
    slogan: 'Lag is a Lifestyle',
    title: 'Lag Is A Lifestyle Tee',
    description: 'Self-roast for high-ping loyalists. No franchise marks, no character art.',
    tags: ['gaming', 'lag', 'queue', 'humor'],
    trendScore: 76,
    safetyScore: 91,
    safetyDecision: 'PASS',
    ipRisk: 5,
    qualityScore: 86,
    estimatedMargin: 70,
    designLabel: 'Pixel-noise wordmark',
    mockupLabel: 'Navy hoodie · chest print',
    status: 'awaiting_approval',
    designPreviewId: 'lag-lifestyle',
  },
  {
    id: 'appr-003',
    niche: 'gaming',
    trend: 'Official Mario Kart Championship Tee',
    slogan: 'Official Championship Circuit',
    title: 'Championship Circuit Tee',
    description: 'Flagged for franchise resemblance — held for reject path.',
    tags: ['gaming', 'racing'],
    trendScore: 92,
    safetyScore: 28,
    safetyDecision: 'REJECT',
    ipRisk: 95,
    qualityScore: 40,
    estimatedMargin: 66,
    designLabel: 'Blocked — IP risk',
    mockupLabel: 'Not generated',
    status: 'rejected',
  },
]

export const DEMO_TRENDS = [
  { niche: 'softball', title: 'Funny Beer League Softball', score: 89, status: 'accepted' },
  { niche: 'baseball', title: 'I Only Swing at Bad Ideas', score: 82, status: 'pending' },
  { niche: 'gaming', title: 'Lag is a Lifestyle', score: 76, status: 'accepted' },
]

export const CONNECTION_STEPS = {
  shopify: [
    'In Shopify Admin → Settings → Apps and sales channels → Develop apps → Allow custom app development.',
    'Create an app (e.g. AI Merch Factory). Configure Admin API scopes: write_products, read_products, write_publications, read_publications, read_orders, write_files (as needed).',
    'Install the app on your store and copy the Admin API access token.',
    'Note your store domain as your-store.myshopify.com.',
    'In Vercel → Project → Settings → Environment Variables, set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN (Production + Preview).',
    'Redeploy. Products will be created as DRAFT while HUMAN_APPROVAL=true and AUTO_PUBLISH=false.',
  ],
  printify: [
    'PART A — Connect Shopify inside Printify (pick one path).',
    'Easiest: Shopify Admin → Apps → Shopify App Store → search “Printify” → install official “Printify: Print on Demand” → Install app → log into your Printify account when prompted.',
    'Alternate: Printify → upper-left store dropdown → Manage my stores → Connect / Add a new store → Shopify → enter YOUR-STORE.myshopify.com → Install in the Shopify popup → Continue in Printify.',
    'Confirm success: Printify lists your Shopify store under Manage my stores, and Shopify Apps shows Printify installed.',
    'PART B — API token for this app: Printify → My Profile → Connections (or https://printify.com/app/account/api) → Generate token → name it bbsdesigns-merch-factory → copy once (expires ~1 year).',
    'PART C — Set PRINTIFY_API_TOKEN in Vercel env vars and .env.local, redeploy, then check /dashboard/providers.',
  ],
  mongodb: [
    'Create a MongoDB Atlas cluster (free tier is fine to start).',
    'Add a database user and allow network access for Vercel (0.0.0.0/0 is common for serverless).',
    'Copy the connection string into MONGODB_URI on Vercel and in .env.local.',
  ],
}
