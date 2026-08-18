import mongoose from 'mongoose'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var __mongooseCache: MongooseCache | undefined
}

const cache: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null }
global.__mongooseCache = cache

export function isMongoConfigured(uri = getEnv().MONGODB_URI): boolean {
  const raw = (process.env.MONGODB_URI || uri || '').trim()
  return raw.length > 0
}

/**
 * Connect to MongoDB with a process-wide cache (safe for Next.js serverless).
 * Throws a clear error when MONGODB_URI is missing.
 */
export async function connectMongo(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn

  const uri = getEnv().MONGODB_URI
  if (!isMongoConfigured(uri)) {
    throw new Error('MONGODB_URI is not configured')
  }

  if (!cache.promise) {
    mongoose.set('strictQuery', true)
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
      })
      .then((m) => {
        logger.info('mongodb_connected', { readyState: m.connection.readyState })
        return m
      })
      .catch((error) => {
        cache.promise = null
        logger.error('mongodb_connect_failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      })
  }

  cache.conn = await cache.promise
  return cache.conn
}

/** Test helper — clears cached connection state. */
export function resetMongoCache(): void {
  cache.conn = null
  cache.promise = null
}
