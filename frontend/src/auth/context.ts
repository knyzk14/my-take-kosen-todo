import { createContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  configurationError: string | null
  redirectError: string | null
  signInWithGoogle: (destination: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
}

export const AuthStateContext = createContext<AuthContextValue | null>(null)