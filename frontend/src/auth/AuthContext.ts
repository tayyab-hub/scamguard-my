import { createContext, useContext } from 'react'
import type { User } from '../lib/api'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (identifier: string, password: string) => Promise<void>
  signUp: (fullName: string, username: string, email: string, password: string) => Promise<void>
  updateProfile: (fullName: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
