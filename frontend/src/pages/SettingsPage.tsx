import { Link2, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'

export function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ message: string; error: boolean } | null>(null)

  useEffect(() => {
    let active = true
    api.getSettings()
      .then((settings) => {
        if (active) setWebhookUrl(settings.discord_webhook_url || '')
      })
      .catch((error: unknown) => {
        if (active) setStatus({ message: error instanceof Error ? error.message : '設定を読み込めませんでした。', error: true })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      const settings = await api.updateSettings(webhookUrl.trim())
      setWebhookUrl(settings.discord_webhook_url || '')
      setStatus({ message: '設定を保存しました。', error: false })
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : '保存できませんでした。', error: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="page-title">設定</h1>
      <p className="page-description">通知先を登録して、提出期限を見逃さないようにしましょう。</p>
      <hr className="section-rule" />
      <section className="settings-panel">
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="discord-webhook">Discord Webhook URL</label>
          <div style={{ position: 'relative' }}>
            <Link2 size={16} style={{ position: 'absolute', left: 13, top: 15, color: '#879189' }} />
            <input
              className="text-input"
              id="discord-webhook"
              type="url"
              autoComplete="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              disabled={loading || saving}
            />
          </div>
          <p className="field-hint">登録したURLには、課題の大変度に応じて提出期限のリマインダーを送信します。空欄で保存すると通知設定を解除します。</p>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={loading || saving}>
              <Save size={15} />{saving ? '保存中...' : '設定を保存'}
            </button>
            {status && <span className={`form-status${status.error ? ' error' : ''}`} role="status">{status.message}</span>}
          </div>
        </form>
      </section>
    </>
  )
}