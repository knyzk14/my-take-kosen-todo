import { AlertCircle, Check, ExternalLink, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Task } from '../types/task'

type TaskListProps = {
  tasks: Task[]
  onToggle: (task: Task, completed: boolean) => Promise<void>
  onDelete: (task: Task) => Promise<void>
}

type TaskFilter = 'open' | 'all' | 'completed'

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
  const [filter, setFilter] = useState<TaskFilter>('open')

  useEffect(() => {
    const updateTime = () => setCurrentTime(Date.now())
    const initialTick = window.setTimeout(updateTime, 0)
    const interval = window.setInterval(updateTime, 60_000)
    return () => {
      window.clearTimeout(initialTick)
      window.clearInterval(interval)
    }
  }, [])

  const visibleTasks = useMemo(() => [...tasks]
    .filter((task) => filter === 'all' || task.is_completed === (filter === 'completed'))
    .sort((first, second) => Date.parse(first.due_date) - Date.parse(second.due_date)), [filter, tasks])

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

  return (
    <section className="task-list-section" aria-label="課題一覧">
      <div className="task-tabs" role="tablist" aria-label="課題の表示">
        {([
          { id: 'open', label: '未完了', count: tasks.filter((task) => !task.is_completed).length },
          { id: 'all', label: 'すべて', count: tasks.length },
          { id: 'completed', label: '完了済み', count: tasks.filter((task) => task.is_completed).length },
        ] as const).map((tab) => (
          <button
            className={`task-tab${filter === tab.id ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            key={tab.id}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}<span>{tab.count}</span>
          </button>
        ))}
      </div>
      {visibleTasks.length === 0 ? (
        <div className="task-list-empty"><Check size={17} /><span>課題はありません</span></div>
      ) : (
        <div className="task-list">
          {visibleTasks.map((task) => {
        const dueTime = Date.parse(task.due_date)
        const isUrgent = !task.is_completed && currentTime !== null && dueTime <= currentTime + 24 * 60 * 60 * 1000
        const isOverdue = !task.is_completed && currentTime !== null && dueTime < currentTime
        const busy = pendingTaskID === task.id
        return (
          <article className={`task-row${task.is_completed ? ' completed' : ''}${isUrgent ? ' urgent' : ''}`} key={task.id}>
            <label className="task-check" aria-label={`${task.title}を${task.is_completed ? '未完了' : '完了'}にする`}>
              <input type="checkbox" checked={task.is_completed} disabled={busy} onChange={(event) => void toggle(task, event.target.checked)} />
              <span><Check size={13} /></span>
            </label>
            <div className="task-row-main">
              <h3 title={task.title}>{task.title}</h3>
              <span className="task-subject" title={task.subject}>{task.subject}</span>
              <span className="task-submission" title={task.submission_type}>{task.submission_type}</span>
              <span className={`task-due${isUrgent ? ' due-urgent' : ''}`}>
                {isUrgent && <AlertCircle size={13} />}
                <span>{isOverdue ? '期限超過' : formatDueDate(task.due_date)}</span>
              </span>
              <span className={`effort-tag effort-${task.effort_level}`}>{['', '軽い', '普通', '重い'][task.effort_level]}</span>
              {task.submission_link && <a className="task-link" href={task.submission_link} target="_blank" rel="noreferrer" aria-label="提出先を開く"><ExternalLink size={14} /></a>}
            </div>
            <button className="task-delete" type="button" title="課題を削除" aria-label={`${task.title}を削除`} disabled={busy} onClick={() => void remove(task)}>
              <Trash2 size={16} />
            </button>
          </article>
        )
          })}
        </div>
      )}
    </section>
  )
}