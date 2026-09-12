import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  currentUser,
  deleteAccount as deleteAccountRequest,
  login as loginRequest,
  logout as logoutRequest,
  setCsrfToken,
  signup as signupRequest,
  updateProfile as updateProfileRequest,
  type User,
} from '../lib/api'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const restored = useRef(false)
  const identityRevision = useRef(0)
  const identityChannel = useRef<BroadcastChannel | null>(null)

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

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const revision = identityRevision.current
    void currentUser()
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
      .finally(() => setLoading(false))
  }, [client])

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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
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
    [authenticate, client, error, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
