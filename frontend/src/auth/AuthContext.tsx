import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { auth, isFirebaseConfigured } from './firebase'
import { AuthStateContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    }, () => {
      setUser(null)
      setLoading(false)
    })
  }, [])

  const value = {
    user,
    loading,
    configurationError: isFirebaseConfigured ? null : 'Firebaseの設定値がありません。.env.exampleを参考にfrontend/.env.localを設定してください。',
    async signInWithGoogle() {
      if (!auth) throw new Error('Firebaseの設定が完了していません。')
      await signInWithPopup(auth, new GoogleAuthProvider())
    },
    async signInWithEmail(email: string, password: string) {
      if (!auth) throw new Error('Firebaseの設定が完了していません。')
      await signInWithEmailAndPassword(auth, email, password)
    },
    async signUpWithEmail(email: string, password: string) {
      if (!auth) throw new Error('Firebaseの設定が完了していません。')
      await createUserWithEmailAndPassword(auth, email, password)
    },
    async signOutUser() {
      if (!auth) throw new Error('Firebaseの設定が完了していません。')
      await signOut(auth)
    },
  }

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>
}
