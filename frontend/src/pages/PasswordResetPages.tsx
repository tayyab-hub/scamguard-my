import { useEffect, useState } from 'react'
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, confirmPasswordReset, requestPasswordReset } from '../lib/api'
import { validateEmail, validateNewPassword } from '../lib/profileValidation'

const GENERIC_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailError = submitted ? validateEmail(email) : null

  return (
    <ResetPanel
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      description="Enter your account email to request a link for choosing a new password."
    >
      {success ? (
        <div role="status" className="rounded-lg border border-accent/25 bg-accent-subtle p-5">
          <MailCheck size={24} className="text-accent" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">Check your email</p>
          <p className="mt-2 text-sm leading-6 text-muted">{GENERIC_MESSAGE}</p>
          <p className="mt-3 text-xs leading-6 text-muted">
            Check your spam folder and allow a few minutes for delivery. Use the most recent email
            if you requested more than one link.
          </p>
          <button
            type="button"
            className="button-secondary mt-4"
            onClick={() => {
              setSuccess(false)
              setError(null)
            }}
          >
            Use another email or retry
          </button>
        </div>
      ) : (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
            if (validateEmail(email)) return
            setPending(true)
            setError(null)
            void requestPasswordReset(email)
              .then(() => setSuccess(true))
              .catch((reason: unknown) =>
                setError(
                  reason instanceof ApiError
                    ? reason.message
                    : 'Password recovery is temporarily unavailable.',
                ),
              )
              .finally(() => setPending(false))
          }}
        >
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-xs font-medium text-body">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              maxLength={320}
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(emailError) || undefined}
              aria-describedby={emailError ? 'reset-email-error' : undefined}
              disabled={pending}
            />
            {emailError && (
              <p id="reset-email-error" role="alert" className="mt-2 text-xs text-danger">
                {emailError}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button
            className="button-primary w-full justify-center"
            disabled={pending}
            aria-busy={pending}
          >
            <KeyRound size={16} aria-hidden="true" />
            {pending ? 'Sending instructions…' : 'Send reset instructions'}
          </button>
        </form>
      )}
      <BackToLogin />
    </ResetPanel>
  )
}

export function ResetPasswordPage() {
  const [params, setParams] = useSearchParams()
  const [token] = useState(() => params.get('token') || '')
  useEffect(() => {
    if (params.has('token')) setParams({}, { replace: true })
  }, [params, setParams])
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordError = submitted ? validateNewPassword(password) : null
  const confirmationError = submitted
    ? !confirmation
      ? 'Confirm your new password.'
      : confirmation !== password
        ? 'Passwords do not match.'
        : null
    : null

  return (
    <ResetPanel
      eyebrow="SECURE PASSWORD RESET"
      title="Choose a new password"
      description="The one-time link expires shortly. A successful reset signs out every existing session for this account."
    >
      {success ? (
        <div role="status" className="rounded-lg border border-accent/25 bg-accent-subtle p-5">
          <MailCheck size={24} className="text-accent" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">Password updated</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            All previous sessions were revoked. Sign in with your new password.
          </p>
          <Link className="button-primary mt-5" to="/login">
            Sign in
          </Link>
        </div>
      ) : !token ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/5 p-4 text-sm text-danger"
        >
          This reset link is incomplete. Request a new password reset email.
        </p>
      ) : (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
            if (validateNewPassword(password) || !confirmation || confirmation !== password) return
            setPending(true)
            setError(null)
            void confirmPasswordReset(token, password)
              .then(() => {
                window.dispatchEvent(new Event('scamguard:unauthorized'))
                setSuccess(true)
              })
              .catch((reason: unknown) =>
                setError(
                  reason instanceof ApiError
                    ? reason.message
                    : 'Password reset is temporarily unavailable.',
                ),
              )
              .finally(() => setPending(false))
          }}
        >
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            error={passwordError}
            pending={pending}
          />
          <PasswordField
            id="confirm-new-password"
            label="Confirm new password"
            value={confirmation}
            onChange={setConfirmation}
            error={confirmationError}
            pending={pending}
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button className="button-primary w-full justify-center" disabled={pending}>
            <KeyRound size={16} aria-hidden="true" />
            {pending ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      )}
      {!success && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5">
          <Link
            to="/forgot-password"
            className="action-link inline-flex min-h-11 items-center text-xs font-semibold text-accent"
          >
            Request a new reset link
          </Link>
          <BackToLogin />
        </div>
      )}
    </ResetPanel>
  )
}

function ResetPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="panel mx-auto max-w-xl p-6 sm:p-8" aria-labelledby="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="page-heading" tabIndex={-1} className="mt-3 text-3xl font-semibold">
        {title}
      </h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-muted">{description}</p>
      {children}
    </section>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  pending,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error: string | null
  pending: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-medium text-body">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        maxLength={128}
        className="input-field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={`${id}-guidance`}
        disabled={pending}
      />
      <p
        id={`${id}-guidance`}
        role={error ? 'alert' : undefined}
        className={`mt-2 text-xs ${error ? 'text-danger' : 'text-muted'}`}
      >
        {error || 'Use 12–128 characters. Long passphrases are welcome.'}
      </p>
    </div>
  )
}

function BackToLogin() {
  return (
    <Link
      className="action-link mt-6 inline-flex items-center gap-2 text-xs font-semibold text-accent"
      to="/login"
    >
      <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
    </Link>
  )
}
