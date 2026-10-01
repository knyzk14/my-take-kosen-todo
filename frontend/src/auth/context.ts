import { createContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  configurationError: string | null
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
}

export const AuthStateContext = createContext<AuthContextValue | null>(null)