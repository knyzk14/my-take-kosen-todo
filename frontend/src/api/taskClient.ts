import { apiClient } from './client'
import type { Task, TaskInput } from '../types/task'

export const taskClient = {
  getTasks: () => apiClient.request<Task[]>('/api/tasks'),
  createTask: (task: TaskInput) => apiClient.request<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),
  updateTask: (id: string, task: TaskInput) => apiClient.request<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  }),
  deleteTask: (id: string) => apiClient.request<void>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
}