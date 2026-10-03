import { BookOpenCheck, ClipboardList, LogOut, Settings2 } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOutUser()
    navigate('/login', { replace: true })
  }

  const initial = user?.displayName?.charAt(0) || user?.email?.charAt(0) || '学'

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="学課 ホーム">
          <span className="brand-mark"><BookOpenCheck size={18} strokeWidth={2.4} /></span>
          <span>KosenTodo</span>
        </NavLink>
        <nav aria-label="メインナビゲーション">
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end to="/">
            <ClipboardList size={17} />課題一覧
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/settings">
            <Settings2 size={17} />設定
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <span className="avatar">
              {user?.photoURL ? <img src={user.photoURL} alt="" /> : initial.toUpperCase()}
            </span>
            <div className="profile-meta">
              <div className="profile-name">{user?.displayName || '学生アカウント'}</div>
              <div className="profile-email">{user?.email}</div>
            </div>
            <button className="icon-button" type="button" title="ログアウト" aria-label="ログアウト" onClick={handleSignOut}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <nav className="mobile-bar" aria-label="メインナビゲーション">
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end to="/">
            <ClipboardList size={17} />課題
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to="/settings">
            <Settings2 size={17} />設定
          </NavLink>
          <button className="icon-button" type="button" title="ログアウト" aria-label="ログアウト" onClick={handleSignOut}>
            <LogOut size={16} />
          </button>
        </nav>
      </aside>
      <main className="main-content"><div className="page-wrap">{children}</div></main>
    </div>
  )
}