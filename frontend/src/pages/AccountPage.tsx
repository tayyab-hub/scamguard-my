import { useState } from 'react'
import { ShieldAlert, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/api'
import { PageHeading } from '../components/PageHeading'

export function AccountPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT / PRIVACY"
        title="Account controls"
        description="Review the minimal account data SCAMGUARD stores and remove it when you choose."
      />
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="panel p-6" aria-labelledby="account-details-heading">
          <h2 id="account-details-heading" className="text-base font-semibold">
            Account details
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Email address</dt>
              <dd className="mt-1 break-all font-medium">{auth.user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Created</dt>
              <dd className="mt-1 font-medium">
                {auth.user ? new Date(auth.user.created_at).toLocaleString() : 'Unavailable'}
              </dd>
            </div>
          </dl>
        </section>
        <section className="panel border-danger/20 p-6" aria-labelledby="delete-account-heading">
          <ShieldAlert size={22} className="text-danger" aria-hidden="true" />
          <h2 id="delete-account-heading" className="mt-4 text-base font-semibold">
            Delete account
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            This permanently deletes your account, invalidates its sessions, and deletes all
            Message, URL and Phone analyses owned by it.
          </p>
          <button className="button-secondary mt-5 text-danger" onClick={() => setConfirming(true)}>
            <Trash2 size={15} aria-hidden="true" /> Delete account
          </button>
        </section>
      </div>
      {confirming && (
        <div className="dialog-backdrop" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-account-delete"
            className="dialog-panel"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !pending) setConfirming(false)
            }}
          >
            <h2 id="confirm-account-delete" className="text-lg font-semibold">
              Permanently delete this account?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Enter your current password to confirm. This cannot be undone from the app.
            </p>
            <label htmlFor="delete-password" className="mb-2 mt-5 block text-xs font-medium">
              Current password
            </label>
            <input
              id="delete-password"
              autoFocus
              type="password"
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
            {error && (
              <p role="alert" className="mt-3 text-xs text-danger">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="button-secondary"
                disabled={pending}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                className="button-primary bg-danger"
                disabled={pending || !password}
                onClick={() => {
                  setPending(true)
                  setError(null)
                  void auth
                    .deleteAccount(password)
                    .then(() => navigate('/login', { replace: true }))
                    .catch((reason: unknown) =>
                      setError(reason instanceof ApiError ? reason.message : 'Deletion failed.'),
                    )
                    .finally(() => setPending(false))
                }}
              >
                {pending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
