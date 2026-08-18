'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type AuthStatus = {
  ok: boolean
  username: string
  mongoConfigured: boolean
  mongoReachable?: boolean
  mongoError?: string
  setupTokenConfigured?: boolean
  authSecretReady?: boolean
  passwordSet: boolean
  authenticated: boolean
  needsSetup: boolean
  locked?: boolean
  lockedUntil?: string | null
  canResetWithSetupToken?: boolean
  message?: string
  error?: string
}

type Mode = 'login' | 'setup' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadStatus() {
    setStatusError('')
    try {
      const res = await fetch('/api/auth/status', { credentials: 'same-origin', cache: 'no-store' })
      const data = (await res.json()) as AuthStatus
      setStatus(data)
      if (!res.ok || data.ok === false) {
        setStatusError(data.error || data.message || 'Could not load auth status')
      }
      if (data.authenticated) {
        const next = new URLSearchParams(window.location.search).get('next') || '/dashboard'
        router.replace(next.startsWith('/') ? next : '/dashboard')
        return
      }
      if (data.needsSetup) setMode('setup')
      else if (data.locked) setMode('reset')
      else setMode('login')
    } catch {
      setStatusError('Network error loading login status — check your connection and retry.')
    }
  }

  useEffect(() => {
    void loadStatus()
    const err = new URLSearchParams(window.location.search).get('err')
    if (err === 'auth_secret') {
      setError('AUTH_SECRET is missing or mismatched on the server. Fix it in Vercel, then redeploy.')
    } else if (err === 'session') {
      setError('Session expired. Sign in again.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const activeMode: Mode =
        mode === 'reset' ? 'reset' : status?.needsSetup && status.mongoConfigured ? 'setup' : mode

      const endpoint =
        activeMode === 'setup'
          ? '/api/auth/setup'
          : activeMode === 'reset'
            ? '/api/auth/reset'
            : '/api/auth/login'

      const body =
        activeMode === 'login'
          ? { username: 'Admin', password }
          : {
              username: 'Admin',
              password,
              confirmPassword,
              setupToken,
            }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error || 'Login failed')
        setPassword('')
        setConfirmPassword('')
        if (res.status === 423) setMode('reset')
        return
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/dashboard'
      router.replace(next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    } catch {
      setError('Network error — try again')
    } finally {
      setBusy(false)
    }
  }

  const needsSetup = Boolean(status?.needsSetup && status.mongoConfigured)
  const activeMode: Mode = mode === 'reset' ? 'reset' : needsSetup ? 'setup' : 'login'
  const envBlocked =
    status &&
    (!status.mongoConfigured ||
      status.mongoReachable === false ||
      status.authSecretReady === false ||
      ((needsSetup || activeMode === 'reset') && !status.setupTokenConfigured))

  const title =
    activeMode === 'setup'
      ? 'Secure admin setup'
      : activeMode === 'reset'
        ? 'Unlock / reset password'
        : 'Admin login'

  const subtitle =
    activeMode === 'setup'
      ? 'Enter your private setup token from Vercel, then choose a strong Admin password.'
      : activeMode === 'reset'
        ? 'Use ADMIN_SETUP_TOKEN from Vercel to unlock a locked account or set a new password.'
        : 'Dashboard access is locked to username Admin. Sessions expire in 7 days.'

  return (
    <main className="scoreboard-grid flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-md border border-line bg-panel/90 p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">bbsdesigns</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-text">{title}</h1>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>

        {status?.locked ? (
          <div className="mt-4 rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
            Account is temporarily locked
            {status.lockedUntil
              ? ` until ${new Date(status.lockedUntil).toLocaleString()}`
              : ''}
            . Use unlock / reset with your setup token below.
          </div>
        ) : null}

        {statusError ? (
          <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {statusError}{' '}
            <button type="button" className="underline" onClick={() => void loadStatus()}>
              Retry
            </button>
          </div>
        ) : null}

        {envBlocked ? (
          <div className="mt-5 rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
            {!status?.mongoConfigured
              ? 'MongoDB is not connected. In Vercel → Settings → Environment Variables, add MONGODB_URI for Production, save, then Redeploy. Atlas Network Access must allow 0.0.0.0/0 (or Vercel IPs).'
              : status.mongoReachable === false
                ? `Mongo is configured but unreachable: ${status.mongoError || 'connection failed'}. Check Atlas Network Access and the URI, then redeploy.`
                : status.authSecretReady === false
                  ? 'Set AUTH_SECRET (32+ random characters) in Vercel for Production, then redeploy.'
                  : 'Set ADMIN_SETUP_TOKEN (16+ random characters) in Vercel before setup/reset, then redeploy.'}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit} autoComplete="off">
          <label className="block text-sm">
            <span className="text-muted">Username</span>
            <input
              className="mt-1 w-full rounded-md border border-line bg-ink/60 px-3 py-2 text-text"
              value="Admin"
              readOnly
              autoComplete="username"
            />
          </label>

          {activeMode !== 'login' ? (
            <label className="block text-sm">
              <span className="text-muted">Setup token (Vercel ADMIN_SETUP_TOKEN)</span>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-text outline-none focus:border-accent"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                autoComplete="off"
                required
                disabled={Boolean(envBlocked)}
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-muted">
              {activeMode === 'login' ? 'Password' : 'New password (12+ chars, letters + numbers)'}
            </span>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-text outline-none focus:border-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={activeMode === 'login' ? 1 : 12}
              disabled={Boolean(envBlocked)}
            />
          </label>

          {activeMode !== 'login' ? (
            <label className="block text-sm">
              <span className="text-muted">Confirm password</span>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-text outline-none focus:border-accent"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={12}
                disabled={Boolean(envBlocked)}
              />
            </label>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={busy || Boolean(envBlocked)}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {busy
              ? 'Working…'
              : activeMode === 'setup'
                ? 'Lock password & enter'
                : activeMode === 'reset'
                  ? 'Reset password & enter'
                  : 'Sign in'}
          </button>
        </form>

        {!needsSetup && status?.canResetWithSetupToken ? (
          <p className="mt-4 text-center text-xs text-muted">
            {activeMode === 'reset' ? (
              <button
                type="button"
                className="text-accent-2 hover:underline"
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                className="text-accent-2 hover:underline"
                onClick={() => {
                  setMode('reset')
                  setError('')
                }}
              >
                Locked out or forgot password? Unlock / reset
              </button>
            )}
          </p>
        ) : null}

        <p className="mt-5 text-center text-xs text-muted">
          <Link href="/" className="text-accent-2 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}
