export type Task = {
  id: string
  title: string
  due_date: string
  is_completed: boolean
  subject: string
  submission_type: string
  submission_link: string | null
  effort_level: 1 | 2 | 3
  created_at?: string
  updated_at?: string
}

export type TaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at'>

export type TaskFields = Omit<TaskInput, 'is_completed'>