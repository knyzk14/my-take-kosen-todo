import { auth } from '../auth/firebase'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export type UserSettings = {
  discord_webhook_url: string | null
  updated_at?: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth?.currentUser
  if (!user) throw new Error('ログインが必要です。')

  const token = await user.getIdToken()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers })
  if (response.status === 204) return undefined as T
  if (!response.ok) {
    const message = (await response.text()).trim()
    throw new Error(message || `API request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const apiClient = { request }

export const api = {
  getSettings: () => request<UserSettings>('/api/settings'),
  updateSettings: (discordWebhookUrl: string) => request<UserSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ discord_webhook_url: discordWebhookUrl }),
  }),
}