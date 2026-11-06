// Shared authentication contract consumed by pages through useAuth. TypeScript describes the
// user/loading/error fields and async operations; AuthProvider supplies their actual values. A
// Promise<void> means an operation finishes or rejects without returning data to its caller.

import { createContext, useContext } from 'react'
import type { User } from '../lib/api'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  // True while session restoration is retrying because the hosted API is still waking up.
  waking: boolean
  error: string | null
  signIn: (identifier: string, password: string) => Promise<void>
  signUp: (fullName: string, username: string, email: string, password: string) => Promise<void>
  updateProfile: (fullName: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

// Read the nearest AuthProvider value and fail clearly if a component is mounted without it.
// Context avoids passing auth props manually through every intermediate component.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
