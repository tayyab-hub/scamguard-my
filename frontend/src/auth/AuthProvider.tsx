// Own browser authentication state and in-memory CSRF, restore the server cookie session, and
// clear private caches on identity changes. BroadcastChannel sends only an identity-change
// notice; cookies and tokens are not broadcast or put in localStorage.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  currentUser,
  deleteAccount as deleteAccountRequest,
  login as loginRequest,
  logout as logoutRequest,
  retryWhileWaking,
  setCsrfToken,
  signup as signupRequest,
  updateProfile as updateProfileRequest,
  type User,
} from '../lib/api'
import { AuthContext, type AuthContextValue } from './AuthContext'

// Wrap children with auth methods/state. useState triggers rendering when state changes; useRef
// keeps mutable revision/channel handles across renders without triggering one. Async responses
// must match the current identity revision before being applied.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [waking, setWaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const restored = useRef(false)
  // Incrementing this revision invalidates old in-flight responses. A slow restoration or
  // profile request must not resurrect private state after logout or another-tab identity
  // changes.
  const identityRevision = useRef(0)
  const identityChannel = useRef<BroadcastChannel | null>(null)

  // Effects synchronize React with external browser resources. The returned cleanup closes this
  // channel when the provider unmounts; another tab notice clears local identity and cache.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('scamguard-session')
    identityChannel.current = channel
    channel.onmessage = () => window.dispatchEvent(new Event('scamguard:unauthorized'))
    return () => {
      channel.close()
      identityChannel.current = null
    }
  }, [])

  useEffect(() => {
    const unauthorize = () => {
      identityRevision.current++
      client.clear()
      setCsrfToken(null)
      setUser(null)
    }
    window.addEventListener('scamguard:unauthorized', unauthorize)
    return () => window.removeEventListener('scamguard:unauthorized', unauthorize)
  }, [client])

  // Restore once through /auth/me, which reads the HttpOnly cookie on the server. A network
  // failure is distinct from a normal 401 and leaves public Help usable.
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const revision = identityRevision.current
    // A sleeping hosted API can need about a minute to start; keep retrying the idempotent
    // restoration read during that window and tell the UI it is waking, not failing.
    void retryWhileWaking(currentUser, () => {
      if (revision === identityRevision.current) setWaking(true)
    })
      .then((result) => {
        if (revision !== identityRevision.current) return
        client.clear()
        setCsrfToken(result.csrf_token)
        setUser(result.user)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (revision !== identityRevision.current) return
        setCsrfToken(null)
        setUser(null)
        if (!(reason instanceof ApiError) || reason.status !== 401) {
          setError('We could not restore your session. You can still use the help centre.')
        }
      })
      .finally(() => {
        setWaking(false)
        setLoading(false)
      })
  }, [client])

  // useCallback keeps this operation stable between renders. Await the server result, then
  // clear old-user queries before installing the new user and CSRF token.
  const authenticate = useCallback(
    async (request: () => ReturnType<typeof loginRequest>) => {
      const revision = ++identityRevision.current
      const result = await request()
      if (revision !== identityRevision.current)
        throw new ApiError('Your session changed in another tab. Please sign in again.')
      client.clear()
      setCsrfToken(result.csrf_token)
      setUser(result.user)
      setError(null)
      setLoading(false)
      identityChannel.current?.postMessage('identity-changed')
    },
    [client],
  )

  // useMemo keeps the context object stable until its dependencies change. Failed logout
  // propagates to the UI; the provider only treats an already-invalid session as signed out.
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      waking,
      error,
      signIn: (identifier, password) => authenticate(() => loginRequest(identifier, password)),
      signUp: (fullName, username, email, password) =>
        authenticate(() => signupRequest(fullName, username, email, password)),
      updateProfile: async (fullName, username) => {
        const revision = identityRevision.current
        const result = await updateProfileRequest(fullName, username)
        if (revision === identityRevision.current) setUser(result.user)
      },
      signOut: async () => {
        try {
          await logoutRequest()
        } catch (reason) {
          if (!(reason instanceof ApiError) || reason.status !== 401) throw reason
        }
        identityRevision.current++
        client.clear()
        setCsrfToken(null)
        setUser(null)
        identityChannel.current?.postMessage('identity-changed')
      },
      deleteAccount: async (password) => {
        await deleteAccountRequest(password)
        identityRevision.current++
        client.clear()
        setCsrfToken(null)
        setUser(null)
        identityChannel.current?.postMessage('identity-changed')
      },
    }),
    [authenticate, client, error, loading, user, waking],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
