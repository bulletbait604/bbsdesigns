import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { ADMIN_USERNAME, AUTH_COOKIE_NAME, SESSION_MAX_AGE_SEC } from '@/lib/auth/constants'
import { getAuthSecret } from '@/lib/auth/secret'
import { assertAuthSecretReady } from '@/lib/auth/security'

export type AdminSession = {
  username: string
  role: 'admin'
}

function secretKey() {
  return new TextEncoder().encode(getAuthSecret())
}

export function sessionCookieOptions(maxAge: number) {
  const secure = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure,
    // lax survives top-level redirects better than strict (login → /dashboard)
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export async function createSessionToken(session: AdminSession): Promise<string> {
  assertAuthSecretReady()
  return new SignJWT({ username: session.username, role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
    })
    if (payload.username !== ADMIN_USERNAME || payload.role !== 'admin') return null
    return { username: ADMIN_USERNAME, role: 'admin' }
  } catch {
    return null
  }
}

/** Prefer attaching the cookie to the Route Handler response (reliable on Vercel). */
export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions(SESSION_MAX_AGE_SEC))
  return response
}

export function clearSessionCookieOn(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE_NAME, '', sessionCookieOptions(0))
  return response
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies()
  jar.set(AUTH_COOKIE_NAME, token, sessionCookieOptions(SESSION_MAX_AGE_SEC))
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies()
  jar.set(AUTH_COOKIE_NAME, '', sessionCookieOptions(0))
}

export async function getSessionFromCookies(): Promise<AdminSession | null> {
  const jar = await cookies()
  const token = jar.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}
