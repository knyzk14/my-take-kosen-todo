import { CircleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, configurationError } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const destination = (location.state as { from?: string } | null)?.from || '/'

  async function handleGoogleSignIn() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
      navigate(destination, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ログインできませんでした。')
    } finally {
      setBusy(false)
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (isSignUp) await signUpWithEmail(email, password)
      else await signInWithEmail(email, password)
      navigate(destination, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '認証できませんでした。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-aside">
        <div className="login-watermark" aria-hidden="true">
          <Logo className="login-watermark-logo" />
        </div>
        <div className="brand login-brand"><span>KosenTodo</span></div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <h1>{isSignUp ? 'Sign up' : 'Log in'}</h1>
          {configurationError && <div className="notice"><CircleAlert size={17} />{configurationError}</div>}
          {error && <div className="notice error"><CircleAlert size={17} />{error}</div>}
          <button className="google-button" type="button" disabled={busy || Boolean(configurationError)} onClick={handleGoogleSignIn}>
            <span className="google-g">G</span>
            {busy ? 'ログイン中...' : 'Googleでログイン'}
          </button>
          <div className="login-divider"><span>または</span></div>
          <form className="email-auth-form" onSubmit={handleEmailSubmit}>
            <label className="field-label" htmlFor="login-email">メールアドレス</label>
            <input
              className="text-input email-auth-input"
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder='example@example.com'
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={busy || Boolean(configurationError)}
            />
            <label className="field-label" htmlFor="login-password">パスワード</label>
            <input
              className="text-input email-auth-input"
              id="login-password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder='password'
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy || Boolean(configurationError)}
            />
            <button className="primary-button email-submit" type="submit" disabled={busy || Boolean(configurationError)}>
              {busy ? '処理中...' : isSignUp ? '新規登録' : 'メールでログイン'}
            </button>
          </form>
          <button className="auth-mode-toggle" type="button" disabled={busy} onClick={() => { setIsSignUp((current) => !current); setError(null) }}>
            {isSignUp ? 'ログインに戻る' : 'アカウントを新規登録'}
          </button>
        </div>
      </section>
    </main>
  )
}