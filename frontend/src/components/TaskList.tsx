import { AlertCircle, Check, ExternalLink, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Task } from '../types/task'

type TaskListProps = {
  tasks: Task[]
  onToggle: (task: Task, completed: boolean) => Promise<void>
  onDelete: (task: Task) => Promise<void>
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  const [pendingTaskID, setPendingTaskID] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<number | null>(null)

  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now())
    const initialTick = window.setTimeout(updateTime, 0)
    const interval = window.setInterval(updateTime, 60_000)
    return () => {
      window.clearTimeout(initialTick)
      window.clearInterval(interval)
    }
  }, [])

  const sortedTasks = useMemo(() => [...tasks].sort((first, second) => {
    if (first.is_completed !== second.is_completed) return first.is_completed ? 1 : -1
    return Date.parse(first.due_date) - Date.parse(second.due_date)
  }), [tasks])

  async function toggle(task: Task, completed: boolean) {
    setPendingTaskID(task.id)
    try {
      await onToggle(task, completed)
    } finally {
      setPendingTaskID(null)
    }
  }

  async function remove(task: Task) {
    if (!window.confirm(`「${task.title}」を削除しますか？`)) return
    setPendingTaskID(task.id)
    try {
      await onDelete(task)
    } finally {
      setPendingTaskID(null)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty">
        <span className="task-list-empty-icon"><Check size={19} /></span>
        <div><strong>課題はまだありません</strong><p>上のフォームから、次の課題を登録しましょう。</p></div>
      </div>
    )
  }

  return (
    <div className="task-list" aria-label="課題一覧">
      {sortedTasks.map((task) => {
        const dueTime = Date.parse(task.due_date)
        const isUrgent = !task.is_completed && currentTime !== null && dueTime <= currentTime + 24 * 60 * 60 * 1000
        const isOverdue = !task.is_completed && currentTime !== null && dueTime < currentTime
        const busy = pendingTaskID === task.id
        return (
          <article className={`task-row${task.is_completed ? ' completed' : ''}${isUrgent ? ' urgent' : ''}`} key={task.id}>
            <label className="task-check" aria-label={`${task.title}を完了にする`}>
              <input type="checkbox" checked={task.is_completed} disabled={busy} onChange={(event) => void toggle(task, event.target.checked)} />
              <span><Check size={13} /></span>
            </label>
            <div className="task-row-main">
              <div className="task-row-title-line">
                <h3>{task.title}</h3>
                <span className={`effort-tag effort-${task.effort_level}`}>{['', '軽い', '普通', '重い'][task.effort_level]}</span>
              </div>
              <div className="task-row-meta">
                <span className="task-subject">{task.subject}</span>
                <span>{task.submission_type}</span>
                {task.submission_link && <a className="task-link" href={task.submission_link} target="_blank" rel="noreferrer" aria-label="提出先を開く"><ExternalLink size={13} /></a>}
              </div>
            </div>
            <div className={`task-due${isUrgent ? ' due-urgent' : ''}`}>
              {isUrgent && <AlertCircle size={14} />}
              <span>{isOverdue ? '期限超過' : formatDueDate(task.due_date)}</span>
            </div>
            <button className="task-delete" type="button" title="課題を削除" aria-label={`${task.title}を削除`} disabled={busy} onClick={() => void remove(task)}>
              <Trash2 size={16} />
            </button>
          </article>
        )
      })}
    </div>
  )
}