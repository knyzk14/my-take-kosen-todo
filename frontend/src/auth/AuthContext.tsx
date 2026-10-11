import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { auth, isFirebaseConfigured } from './firebase'
import { AuthStateContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const [redirectError, setRedirectError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) return
    let isMounted = true
    let authStateInitialized = false
    let redirectResultHandled = false
    const finishLoading = () => {
      if (isMounted && authStateInitialized && redirectResultHandled) setLoading(false)
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!isMounted) return
      setUser(nextUser)
      authStateInitialized = true
      finishLoading()
    }, (error) => {
      if (!isMounted) return
      setUser(null)
      setRedirectError(error.message)
      authStateInitialized = true
      finishLoading()
    })

    void getRedirectResult(auth).then((result) => {
      if (!isMounted) return
      if (result?.user) {
        setUser(result.user)
      }
    }).catch((error: unknown) => {
      if (!isMounted) return
      sessionStorage.removeItem('auth-redirect-destination')
      setRedirectError(error instanceof Error ? error.message : 'Googleログインを完了できませんでした。')
    }).finally(() => {
      redirectResultHandled = true
      finishLoading()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const value = {
    user,
    loading,
    redirectError,
    configurationError: isFirebaseConfigured ? null : 'Firebaseの設定値がありません。.env.exampleを参考にfrontend/.env.localを設定してください。',
    async signInWithGoogle(destination: string) {
      if (!auth) throw new Error('Firebaseの設定が完了していません。')
      const provider = new GoogleAuthProvider()
      try {
        await signInWithPopup(auth, provider)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/popup-blocked') {
          sessionStorage.setItem('auth-redirect-destination', destination)
          try {
            await signInWithRedirect(auth, provider)
          } catch (redirectError) {
            sessionStorage.removeItem('auth-redirect-destination')
            throw redirectError
          }
          return
        }
        throw error
      }
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
