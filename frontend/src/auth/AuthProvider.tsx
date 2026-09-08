import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiError,
  currentUser,
  deleteAccount as deleteAccountRequest,
  login as loginRequest,
  logout as logoutRequest,
  setCsrfToken,
  signup as signupRequest,
  type User,
} from '../lib/api'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const restored = useRef(false)

  useEffect(() => {
    const unauthorize = () => {
      setCsrfToken(null)
      setUser(null)
    }
    window.addEventListener('scamguard:unauthorized', unauthorize)
    return () => window.removeEventListener('scamguard:unauthorized', unauthorize)
  }, [])

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    void currentUser()
      .then((result) => {
        setCsrfToken(result.csrf_token)
        setUser(result.user)
        setError(null)
      })
      .catch((reason: unknown) => {
        setCsrfToken(null)
        setUser(null)
        if (!(reason instanceof ApiError) || reason.status !== 401) {
          setError('We could not restore your session. You can still use the help centre.')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const authenticate = useCallback(
    async (
      request: (email: string, password: string) => ReturnType<typeof loginRequest>,
      email: string,
      password: string,
    ) => {
      const result = await request(email, password)
      setCsrfToken(result.csrf_token)
      setUser(result.user)
      setError(null)
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signIn: (email, password) => authenticate(loginRequest, email, password),
      signUp: (email, password) => authenticate(signupRequest, email, password),
      signOut: async () => {
        try {
          await logoutRequest()
        } finally {
          setCsrfToken(null)
          setUser(null)
        }
      },
      deleteAccount: async (password) => {
        await deleteAccountRequest(password)
        setCsrfToken(null)
        setUser(null)
      },
    }),
    [authenticate, error, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
