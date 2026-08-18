import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { getEnv } from '@/lib/env'
import type {
  ProviderConfigValidation,
  ProviderHealth,
  StorageProvider,
  StoragePutRequest,
  StoragePutResult,
} from '@/providers/types'

function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`
}

function isR2Configured(): boolean {
  const env = getEnv()
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME
  )
}

function createClient(): S3Client {
  const env = getEnv()
  return new S3Client({
    region: 'auto',
    endpoint: r2Endpoint(env.R2_ACCOUNT_ID),
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

/** Cloudflare R2 via S3-compatible API. */
export function createR2StorageProvider(name = 'cloudflare-r2'): StorageProvider {
  return {
    kind: 'storage',
    name,
    validateConfig(): ProviderConfigValidation {
      const env = getEnv()
      const missing: string[] = []
      if (!env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID')
      if (!env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID')
      if (!env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY')
      if (!env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME')
      if (!env.R2_PUBLIC_URL) missing.push('R2_PUBLIC_URL')
      return {
        ok: missing.length === 0,
        missing,
        message:
          missing.length === 0
            ? 'R2 configured'
            : `Missing R2 env: ${missing.join(', ')}`,
      }
    },
    async healthCheck(): Promise<ProviderHealth> {
      const validation = this.validateConfig()
      if (!validation.ok) {
        return {
          ok: false,
          provider: name,
          kind: 'storage',
          message: validation.message,
          checkedAt: new Date().toISOString(),
        }
      }
      try {
        const env = getEnv()
        const client = createClient()
        await client.send(new HeadBucketCommand({ Bucket: env.R2_BUCKET_NAME }))
        return {
          ok: true,
          provider: name,
          kind: 'storage',
          message: 'R2 bucket reachable',
          checkedAt: new Date().toISOString(),
        }
      } catch (error) {
        return {
          ok: false,
          provider: name,
          kind: 'storage',
          message: error instanceof Error ? error.message : String(error),
          checkedAt: new Date().toISOString(),
        }
      }
    },
    async putObject(request: StoragePutRequest): Promise<StoragePutResult> {
      const validation = this.validateConfig()
      if (!validation.ok) {
        throw new Error(validation.message || 'R2 not configured')
      }
      const env = getEnv()
      const client = createClient()
      await client.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: request.key,
          Body: request.body,
          ContentType: request.contentType,
        })
      )
      return { key: request.key, url: this.getPublicUrl(request.key) }
    },
    getPublicUrl(key: string): string {
      const env = getEnv()
      const base = (env.R2_PUBLIC_URL || '').replace(/\/$/, '')
      const path = key.replace(/^\//, '')
      return `${base}/${path}`
    },
  }
}

export function shouldUseR2Storage(): boolean {
  return isR2Configured()
}
