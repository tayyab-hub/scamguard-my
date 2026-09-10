import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/api'
import {
  validateEmail,
  validateFullName,
  validateNewPassword,
  validateUsername,
} from '../lib/profileValidation'

type FieldName = 'fullName' | 'username' | 'email' | 'password' | 'confirmation'

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [error, setError] = useState<string | null>(null)
  const signup = mode === 'signup'
  const destination = (() => {
    const candidate = (location.state as { from?: unknown } | null)?.from
    return typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
      ? candidate
      : '/'
  })()

  if (!auth.loading && auth.user) return <Navigate to={destination} replace />

  const errors: Partial<Record<FieldName, string>> = signup
    ? {
        fullName: validateFullName(fullName) || undefined,
        username: validateUsername(username) || undefined,
        email: validateEmail(identifier) || undefined,
        password: validateNewPassword(password) || undefined,
        confirmation:
          confirmation.length === 0
            ? 'Confirm your password.'
            : confirmation !== password
              ? 'Passwords do not match.'
              : undefined,
      }
    : {
        email: identifier.trim() ? undefined : 'Enter your username or email.',
        password: password ? undefined : 'Enter your password.',
      }
  const visibleError = (field: FieldName) =>
    (submitted || touched[field]) && errors[field] ? errors[field] : undefined
  const markTouched = (field: FieldName) => setTouched((current) => ({ ...current, [field]: true }))

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="panel p-6 sm:p-8" aria-labelledby="page-heading">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-accent/20 bg-accent-subtle text-accent">
            <UserRound size={20} aria-hidden="true" />
          </span>
          <p className="eyebrow">PRIVATE WORKSPACE</p>
        </div>
        <h1 id="page-heading" tabIndex={-1} className="mt-5 text-3xl font-semibold text-ink">
          {signup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
          {signup
            ? 'Create a private identity for your Message, URL, Phone and QR analysis history.'
            : 'Sign in with your username or email to return to your private workspace.'}
        </p>
        <form
          className="mt-8 space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
            if (Object.values(errors).some(Boolean)) return
            setPending(true)
            setError(null)
            const request = signup
              ? auth.signUp(fullName, username, identifier, password)
              : auth.signIn(identifier, password)
            void request
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
          {signup && (
            <div className="grid gap-5 sm:grid-cols-2">
              <AuthField
                id="auth-full-name"
                label="Full name"
                value={fullName}
                onChange={setFullName}
                onBlur={() => markTouched('fullName')}
                error={visibleError('fullName')}
                helper="Use your real name in the form you prefer."
                autoComplete="name"
                maxLength={100}
                pending={pending}
              />
              <AuthField
                id="auth-username"
                label="Username"
                value={username}
                onChange={setUsername}
                onBlur={() => markTouched('username')}
                error={visibleError('username')}
                helper="3–30 letters, numbers, or underscores."
                autoComplete="username"
                maxLength={30}
                pending={pending}
                spellCheck={false}
              />
            </div>
          )}
          <AuthField
            id="auth-identifier"
            label={signup ? 'Email address' : 'Username or email'}
            type={signup ? 'email' : 'text'}
            value={identifier}
            onChange={setIdentifier}
            onBlur={() => markTouched('email')}
            error={visibleError('email')}
            helper={signup ? 'Used for account recovery. It is not shown publicly.' : undefined}
            autoComplete={signup ? 'email' : 'username'}
            maxLength={320}
            pending={pending}
            spellCheck={false}
          />
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="auth-password" className="block text-xs font-medium text-body">
                Password
              </label>
              {!signup && (
                <Link
                  className="action-link text-xs font-semibold text-accent"
                  to="/forgot-password"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type={visible ? 'text' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                maxLength={128}
                className="input-field pr-12"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => markTouched('password')}
                aria-describedby={signup ? 'password-guidance' : undefined}
                aria-invalid={Boolean(visibleError('password')) || undefined}
                disabled={pending}
              />
              <button
                type="button"
                className="button-quiet absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded text-muted"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                disabled={pending}
              >
                {visible ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
            <p
              id="password-guidance"
              className={`mt-2 text-xs ${visibleError('password') ? 'text-danger' : 'text-muted'}`}
              role={visibleError('password') ? 'alert' : undefined}
            >
              {visibleError('password') ||
                (signup ? 'Use 12–128 characters. Long, memorable passphrases are welcome.' : '')}
            </p>
          </div>
          {signup && (
            <AuthField
              id="auth-confirm"
              label="Confirm password"
              type={visible ? 'text' : 'password'}
              value={confirmation}
              onChange={setConfirmation}
              onBlur={() => markTouched('confirmation')}
              error={visibleError('confirmation')}
              autoComplete="new-password"
              maxLength={128}
              pending={pending}
            />
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
            <li>
              Each Message, URL, Phone and QR analysis is assigned by the server to your account.
            </li>
            <li>Other users cannot list, open, edit, or delete your records.</li>
            <li>Completed results remain unchanged; Analyse again creates a fresh record.</li>
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

type AuthFieldProps = {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  helper?: string
  autoComplete: string
  maxLength: number
  pending: boolean
  spellCheck?: boolean
}

function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  helper,
  ...input
}: AuthFieldProps) {
  const descriptionId = error || helper ? `${id}-description` : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium text-body">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="input-field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={descriptionId}
        disabled={input.pending}
        autoComplete={input.autoComplete}
        maxLength={input.maxLength}
        spellCheck={input.spellCheck}
      />
      {(error || helper) && (
        <p
          id={descriptionId}
          role={error ? 'alert' : undefined}
          className={`mt-2 text-xs ${error ? 'text-danger' : 'text-muted'}`}
        >
          {error || helper}
        </p>
      )}
    </div>
  )
}
