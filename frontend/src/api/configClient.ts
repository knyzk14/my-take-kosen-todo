import { apiClient } from './client'

export type MasterData = {
  subjects: { name: string; keywords: string[] }[]
  submission_types: { name: string; domains: string[] }[]
}

export const configClient = {
  getConfig: () => apiClient.request<MasterData>('/api/config'),
}