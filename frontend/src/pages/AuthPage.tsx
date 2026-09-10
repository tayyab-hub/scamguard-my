import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/api'

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signup = mode === 'signup'
  const destination = (() => {
    const candidate = (location.state as { from?: unknown } | null)?.from
    return typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
      ? candidate
      : '/'
  })()

  if (!auth.loading && auth.user) return <Navigate to={destination} replace />

  const passwordError = signup && password.length > 0 && password.length < 12
  const confirmationError = signup && confirmation.length > 0 && confirmation !== password

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="panel p-6 sm:p-8" aria-labelledby="page-heading">
        <p className="eyebrow">PRIVATE WORKSPACE</p>
        <h1 id="page-heading" tabIndex={-1} className="mt-3 text-3xl font-semibold text-ink">
          {signup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
          {signup
            ? 'Your analyses are linked to your account and kept separate from every other user.'
            : 'Sign in to analyse messages and URLs or return to your private history.'}
        </p>
        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (passwordError || confirmationError || !email || !password) return
            setPending(true)
            setError(null)
            void (signup ? auth.signUp(email, password) : auth.signIn(email, password))
              .then(() => navigate(destination, { replace: true }))
              .catch((reason: unknown) =>
                setError(
                  reason instanceof ApiError
                    ? reason.message
                    : 'Authentication is temporarily unavailable.',
                ),
              )
              .finally(() => setPending(false))
          }}
        >
          <div>
            <label htmlFor="auth-email" className="mb-2 block text-xs font-medium text-body">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-2 block text-xs font-medium text-body">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={visible ? 'text' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
                minLength={signup ? 12 : 1}
                maxLength={128}
                className="input-field pr-12"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={signup ? 'password-guidance' : undefined}
                aria-invalid={passwordError || undefined}
                disabled={pending}
              />
              <button
                type="button"
                className="button-quiet absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded text-muted"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? 'Hide password' : 'Show password'}
              >
                {visible ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
            {signup && (
              <p
                id="password-guidance"
                className={`mt-2 text-xs ${passwordError ? 'text-danger' : 'text-muted'}`}
              >
                Use at least 12 characters. Long, memorable phrases are welcome.
              </p>
            )}
          </div>
          {signup && (
            <div>
              <label htmlFor="auth-confirm" className="mb-2 block text-xs font-medium text-body">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                required
                maxLength={128}
                className="input-field"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                aria-invalid={confirmationError || undefined}
                aria-describedby={confirmationError ? 'confirmation-error' : undefined}
                disabled={pending}
              />
              {confirmationError && (
                <p id="confirmation-error" role="alert" className="mt-2 text-xs text-danger">
                  Passwords do not match.
                </p>
              )}
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <button type="submit" className="button-primary w-full justify-center" disabled={pending}>
            <LockKeyhole size={16} aria-hidden="true" />
            {pending
              ? signup
                ? 'Creating account…'
                : 'Signing in…'
              : signup
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">
          {signup ? 'Already have an account?' : 'New to SCAMGUARD?'}{' '}
          <Link
            className="action-link font-semibold text-accent"
            to={signup ? '/login' : '/signup'}
          >
            {signup ? 'Sign in' : 'Create account'}
          </Link>
        </p>
      </section>
      <aside className="panel flex flex-col justify-between bg-surface-raised p-6 sm:p-8">
        <div>
          <ShieldCheck size={30} className="text-accent" aria-hidden="true" />
          <h2 className="mt-5 text-xl font-semibold">Built around private ownership</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
            <li>Each Message, URL and Phone analysis is assigned by the server to your account.</li>
            <li>Other users cannot list, open, or delete your records.</li>
            <li>You can remove individual analyses or delete your account and linked data.</li>
          </ul>
        </div>
        <p className="mt-8 text-xs leading-5 text-muted">
          This remains an academic prototype. Never submit passwords, recovery phrases, payment
          credentials, or highly sensitive personal information.
        </p>
      </aside>
    </div>
  )
}
