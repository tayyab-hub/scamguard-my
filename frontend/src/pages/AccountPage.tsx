import { useState } from 'react'
import { Database, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../lib/api'
import { PageHeading } from '../components/PageHeading'
import { validateFullName, validateUsername } from '../lib/profileValidation'
import { ModalDialog } from '../components/ModalDialog'
import { Link } from 'react-router-dom'

export function AccountPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState(auth.user?.full_name || '')
  const [username, setUsername] = useState(auth.user?.username || '')
  const [profilePending, setProfilePending] = useState(false)
  const [profileSubmitted, setProfileSubmitted] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const fullNameError = profileSubmitted ? validateFullName(fullName) : null
  const usernameError = profileSubmitted ? validateUsername(username) : null
  const profileDirty =
    fullName !== (auth.user?.full_name || '') || username !== (auth.user?.username || '')
  const cancelDeletion = () => {
    setConfirming(false)
    setPassword('')
    setError(null)
  }

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT / PRIVACY"
        title="Account controls"
        description="Manage your private profile, saved analyses and account."
      />
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="panel p-6" aria-labelledby="account-details-heading">
          <h2 id="account-details-heading" className="text-base font-semibold">
            Profile details
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted">
            Your profile is editable. Email remains read-only until verified email changes are
            supported.
          </p>
          <form
            className="mt-5 space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              setProfileSubmitted(true)
              setProfileSaved(false)
              if (validateFullName(fullName) || validateUsername(username)) return
              setProfilePending(true)
              setProfileError(null)
              void auth
                .updateProfile(fullName, username)
                .then(() => setProfileSaved(true))
                .catch((reason: unknown) =>
                  setProfileError(
                    reason instanceof ApiError ? reason.message : 'Profile update failed.',
                  ),
                )
                .finally(() => setProfilePending(false))
            }}
          >
            <div>
              <label htmlFor="profile-full-name" className="mb-2 block text-xs font-medium">
                Full name
              </label>
              <input
                id="profile-full-name"
                className="input-field"
                autoComplete="name"
                maxLength={100}
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value)
                  setProfileSaved(false)
                }}
                aria-invalid={Boolean(fullNameError) || undefined}
                aria-describedby={fullNameError ? 'profile-full-name-error' : undefined}
                disabled={profilePending}
              />
              {fullNameError && (
                <p id="profile-full-name-error" role="alert" className="mt-2 text-xs text-danger">
                  {fullNameError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="profile-username" className="mb-2 block text-xs font-medium">
                Username
              </label>
              <input
                id="profile-username"
                className="input-field"
                autoComplete="username"
                maxLength={30}
                spellCheck={false}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  setProfileSaved(false)
                }}
                aria-invalid={Boolean(usernameError) || undefined}
                aria-describedby={
                  usernameError ? 'profile-username-error' : 'profile-username-help'
                }
                disabled={profilePending}
              />
              <p id="profile-username-help" className="mt-2 text-xs text-muted">
                3–30 letters, numbers, or underscores. Saved in lowercase.
              </p>
              {usernameError && (
                <p id="profile-username-error" role="alert" className="mt-2 text-xs text-danger">
                  {usernameError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-2 block text-xs font-medium">
                Email address
              </label>
              <input
                id="profile-email"
                className="input-field"
                value={auth.user?.email || ''}
                readOnly
                aria-readonly="true"
              />
            </div>
            {profileError && (
              <p role="alert" className="text-xs text-danger">
                {profileError}
              </p>
            )}
            {profileSaved && (
              <p role="status" className="motion-fade text-xs font-medium text-accent">
                Profile saved.
              </p>
            )}
            <button
              className="button-primary"
              disabled={profilePending || !profileDirty}
              aria-busy={profilePending}
            >
              <Save size={15} aria-hidden="true" /> {profilePending ? 'Saving…' : 'Save profile'}
            </button>
          </form>
          <dl className="mt-6 border-t border-line pt-5 text-sm">
            <div>
              <dt className="text-xs text-muted">Created</dt>
              <dd className="mt-1 font-medium">
                {auth.user ? new Date(auth.user.created_at).toLocaleString() : 'Unavailable'}
              </dd>
            </div>
          </dl>
        </section>
        <section className="panel p-6" aria-labelledby="stored-data-heading">
          <Database size={22} className="text-accent" aria-hidden="true" />
          <h2 id="stored-data-heading" className="mt-4 text-base font-semibold">
            Where your data appears
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your saved content and assessments appear only in your account’s Overview and Analysis
            History. Other users cannot access them. You can delete individual analyses from
            History.
          </p>
          <Link to="/history" className="button-secondary mt-5">
            Manage analysis history
          </Link>
          <Link
            to="/help#privacy-heading"
            className="action-link ml-3 inline-flex min-h-11 items-center text-xs font-semibold text-accent"
          >
            Privacy and retention
          </Link>
          <p className="mt-3 text-sm leading-6 text-muted">
            Completed results are immutable for forensic integrity. You may delete them or use
            Analyse again to copy the input into a new, editable draft and create a separate record.
          </p>
        </section>
        <section className="panel border-danger/20 p-6" aria-labelledby="delete-account-heading">
          <ShieldAlert size={22} className="text-danger" aria-hidden="true" />
          <h2 id="delete-account-heading" className="mt-4 text-base font-semibold">
            Delete account
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            This permanently deletes your account, invalidates its sessions, and deletes all
            Message, URL, Phone and QR analyses owned by it.
          </p>
          <button className="button-secondary mt-5 text-danger" onClick={() => setConfirming(true)}>
            <Trash2 size={15} aria-hidden="true" /> Delete account
          </button>
        </section>
      </div>
      {confirming && (
        <ModalDialog headingId="confirm-account-delete" onCancel={cancelDeletion} busy={pending}>
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
            data-dialog-initial
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
            <button className="button-secondary" disabled={pending} onClick={cancelDeletion}>
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
        </ModalDialog>
      )}
    </>
  )
}
