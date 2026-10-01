import { ArrowUpRight, BookOpenCheck, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const { signInWithGoogle, configurationError } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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

  return (
    <main className="login-layout">
      <section className="login-aside">
        <div className="brand"><span className="brand-mark"><BookOpenCheck size={18} /></span><span>学課</span></div>
        <div className="aside-copy">
          <p className="eyebrow">YOUR SCHOOLWORK, IN ORDER</p>
          <h1>課題のこと、<br /><span>ひとつずつ。</span></h1>
          <p>提出期限も、教科ごとの課題も。今日やることが見える場所にまとめよう。</p>
        </div>
        <div className="aside-foot">学びのリズムを、整える。</div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow" style={{ color: 'var(--green)' }}>WELCOME BACK</p>
          <h2>ログイン</h2>
          <p>アカウントでログインして、課題を確認しましょう。</p>
          {configurationError && <div className="notice"><CircleAlert size={17} />{configurationError}</div>}
          {error && <div className="notice error"><CircleAlert size={17} />{error}</div>}
          <button className="google-button" type="button" disabled={busy || Boolean(configurationError)} onClick={handleGoogleSignIn}>
            <span className="google-g">G</span>
            {busy ? 'ログイン中...' : 'Googleでログイン'}
            {!busy && <ArrowUpRight size={16} />}
          </button>
          <p className="login-note">ログインすることで、あなた専用の課題と設定にアクセスできます。</p>
        </div>
      </section>
    </main>
  )
}