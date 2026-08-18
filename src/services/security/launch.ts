import { getEnv, missingOptionalIntegrations } from '@/lib/env'
import { runSecurityPass, securitySummary, type SecurityCheck } from '@/services/security/pass'

export type LaunchItemStatus = 'PASS' | 'FAIL' | 'WARNING'

export type LaunchChecklistItem = {
  id: string
  label: string
  status: LaunchItemStatus
  detail: string
}

export type LaunchReport = {
  generatedAt: string
  productionReady: boolean
  summary: { pass: number; fail: number; warning: number }
  items: LaunchChecklistItem[]
  security: SecurityCheck[]
}

/** Controlled launch checklist — never claims ready if FAIL items remain. */
export function buildLaunchReport(): LaunchReport {
  const env = getEnv()
  const security = runSecurityPass(env)
  const sec = securitySummary(security)
  const missing = missingOptionalIntegrations(env)

  const items: LaunchChecklistItem[] = [
    {
      id: 'vercel-env',
      label: 'Vercel environment variables',
      status: env.APP_URL && !env.APP_URL.includes('localhost') ? 'PASS' : 'WARNING',
      detail: `APP_URL=${env.APP_URL || '(empty)'}`,
    },
    {
      id: 'mongodb',
      label: 'MongoDB production connection',
      status: env.MONGODB_URI ? 'PASS' : 'FAIL',
      detail: env.MONGODB_URI ? 'MONGODB_URI set.' : 'MONGODB_URI missing.',
    },
    {
      id: 'shopify',
      label: 'Shopify production credentials',
      status:
        env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'PASS' : 'WARNING',
      detail:
        env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN
          ? 'Shopify domain + admin token set.'
          : 'Shopify credentials incomplete.',
    },
    {
      id: 'printify',
      label: 'Printify production credentials',
      status: env.PRINTIFY_API_TOKEN && env.PRINTIFY_SHOP_ID ? 'PASS' : 'WARNING',
      detail:
        env.PRINTIFY_API_TOKEN && env.PRINTIFY_SHOP_ID
          ? 'Printify token + shop id set.'
          : 'Printify credentials incomplete.',
    },
    {
      id: 'ai',
      label: 'AI provider credentials',
      status: env.AI_TEXT_API_KEY && env.IMAGE_API_KEY ? 'PASS' : 'WARNING',
      detail:
        env.AI_TEXT_API_KEY && env.IMAGE_API_KEY
          ? 'AI text + image keys set.'
          : 'AI keys optional until live generation.',
    },
    {
      id: 'storage',
      label: 'Storage credentials (R2)',
      status:
        env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME
          ? 'PASS'
          : 'WARNING',
      detail: 'R2 optional until permanent asset storage is required.',
    },
    {
      id: 'logging',
      label: 'Logging',
      status: 'PASS',
      detail: 'Structured JSON logger enabled for pipeline events.',
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      status: 'WARNING',
      detail: 'Add Vercel/uptime alerts for /api/health and failed automation runs.',
    },
    {
      id: 'webhooks',
      label: 'Webhook verification',
      status: env.SHOPIFY_WEBHOOK_SECRET ? 'PASS' : 'WARNING',
      detail: env.SHOPIFY_WEBHOOK_SECRET
        ? 'Shopify HMAC at /api/webhooks/shopify; optional Printify secret at /api/webhooks/printify.'
        : 'Set SHOPIFY_WEBHOOK_SECRET before trusting live order webhooks.',
    },
    {
      id: 'backups',
      label: 'Backup strategy',
      status: env.MONGODB_URI ? 'WARNING' : 'FAIL',
      detail: env.MONGODB_URI
        ? 'Enable Atlas continuous backup / snapshots for production data.'
        : 'No MongoDB — cannot back up product provenance.',
    },
    {
      id: 'error-alerts',
      label: 'Error alerts',
      status: 'WARNING',
      detail: 'Wire email/Slack alerts for FAILED publishing and auth lockouts.',
    },
    {
      id: 'auto-publish-off',
      label: 'AUTO_PUBLISH=false',
      status: !env.AUTO_PUBLISH ? 'PASS' : 'FAIL',
      detail: !env.AUTO_PUBLISH ? 'Safe default.' : 'Disable AUTO_PUBLISH for controlled launch.',
    },
    {
      id: 'human-approval-on',
      label: 'HUMAN_APPROVAL=true',
      status: env.HUMAN_APPROVAL ? 'PASS' : 'FAIL',
      detail: env.HUMAN_APPROVAL ? 'Safe default.' : 'Enable HUMAN_APPROVAL for controlled launch.',
    },
    {
      id: 'security-pass',
      label: 'Security pass (017)',
      status: sec.fail > 0 ? 'FAIL' : sec.warning > 0 ? 'WARNING' : 'PASS',
      detail: `${sec.pass} pass / ${sec.warning} warning / ${sec.fail} fail`,
    },
  ]

  if (missing.length) {
    items.push({
      id: 'missing-integrations',
      label: 'Integration gaps',
      status: 'WARNING',
      detail: missing.join(', '),
    })
  }

  const summary = {
    pass: items.filter((i) => i.status === 'PASS').length,
    fail: items.filter((i) => i.status === 'FAIL').length,
    warning: items.filter((i) => i.status === 'WARNING').length,
  }

  return {
    generatedAt: new Date().toISOString(),
    productionReady: summary.fail === 0 && sec.fail === 0,
    summary,
    items,
    security,
  }
}
