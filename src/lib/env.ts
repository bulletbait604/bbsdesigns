import { z } from 'zod'

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === 'boolean') return v
    const s = v.trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'yes'
  })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  MONGODB_URI: z.string().optional().default(''),

  SHOPIFY_STORE_DOMAIN: z.string().optional().default(''),
  SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().optional().default(''),
  SHOPIFY_API_VERSION: z.string().default('2026-07'),

  PRINTIFY_API_TOKEN: z.string().optional().default(''),
  PRINTIFY_SHOP_ID: z.string().optional().default(''),
  PRINTIFY_BLUEPRINT_ID: z.string().optional().default(''),
  PRINTIFY_PRINT_PROVIDER_ID: z.string().optional().default(''),

  AI_TEXT_PROVIDER: z.string().optional().default(''),
  AI_TEXT_API_KEY: z.string().optional().default(''),

  IMAGE_PROVIDER: z.string().optional().default(''),
  IMAGE_API_KEY: z.string().optional().default(''),

  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET_NAME: z.string().optional().default(''),
  R2_PUBLIC_URL: z.string().optional().default(''),

  AUTH_SECRET: z.string().optional().default(''),
  /** One-time bootstrap secret required to set the Admin password the first time. */
  ADMIN_SETUP_TOKEN: z.string().optional().default(''),

  HUMAN_APPROVAL: boolFromEnv.default(true),
  AUTO_PUBLISH: boolFromEnv.default(false),
  MIN_DESIGN_QUALITY_SCORE: z.coerce.number().min(0).max(100).default(85),
  MIN_SAFETY_SCORE: z.coerce.number().min(0).max(100).default(90),
})

export type AppEnv = z.infer<typeof envSchema>

let cached: AppEnv | null = null

/**
 * Explicit process.env.* reads so Next.js/Vercel keep these server env vars
 * available at runtime (dynamic process.env access alone can miss them).
 */
function readProcessEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_ADMIN_ACCESS_TOKEN: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
    PRINTIFY_API_TOKEN: process.env.PRINTIFY_API_TOKEN,
    PRINTIFY_SHOP_ID: process.env.PRINTIFY_SHOP_ID,
    PRINTIFY_BLUEPRINT_ID: process.env.PRINTIFY_BLUEPRINT_ID,
    PRINTIFY_PRINT_PROVIDER_ID: process.env.PRINTIFY_PRINT_PROVIDER_ID,
    AI_TEXT_PROVIDER: process.env.AI_TEXT_PROVIDER,
    AI_TEXT_API_KEY: process.env.AI_TEXT_API_KEY,
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER,
    IMAGE_API_KEY: process.env.IMAGE_API_KEY,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    ADMIN_SETUP_TOKEN: process.env.ADMIN_SETUP_TOKEN,
    HUMAN_APPROVAL: process.env.HUMAN_APPROVAL,
    AUTO_PUBLISH: process.env.AUTO_PUBLISH,
    MIN_DESIGN_QUALITY_SCORE: process.env.MIN_DESIGN_QUALITY_SCORE,
    MIN_SAFETY_SCORE: process.env.MIN_SAFETY_SCORE,
    CRON_SECRET: process.env.CRON_SECRET,
  }
}

export function getEnv(): AppEnv {
  if (cached) return cached
  const parsed = envSchema.safeParse(readProcessEnv())
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Invalid environment: ${details}`)
  }
  cached = parsed.data
  return cached
}


/** Clears cached env — for tests only. */
export function resetEnvCache(): void {
  cached = null
}

/** Soft check for optional integrations — foundation boot does not require them. */
export function missingOptionalIntegrations(env: AppEnv = getEnv()): string[] {
  const missing: string[] = []
  if (!env.MONGODB_URI) missing.push('MONGODB_URI')
  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_ACCESS_TOKEN) missing.push('SHOPIFY')
  if (!env.PRINTIFY_API_TOKEN) missing.push('PRINTIFY_API_TOKEN')
  if (!env.AI_TEXT_API_KEY) missing.push('AI_TEXT_API_KEY')
  if (!env.IMAGE_API_KEY) missing.push('IMAGE_API_KEY')
  return missing
}
