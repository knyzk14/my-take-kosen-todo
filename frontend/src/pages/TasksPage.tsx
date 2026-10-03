import { useEffect, useState } from 'react'
import { AlertCircle, Plus, X } from 'lucide-react'
import { configClient, type MasterData } from '../api/configClient'
import { taskClient } from '../api/taskClient'
import { TaskForm } from '../components/TaskForm'
import { TaskList } from '../components/TaskList'
import type { Task, TaskInput } from '../types/task'

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [masterData, setMasterData] = useState<MasterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    let active = true
    const loadTasks = taskClient.getTasks()
      .then((nextTasks) => { if (active) setTasks(nextTasks) })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : '課題を読み込めませんでした。')
      })
    const loadConfig = configClient.getConfig()
      .then((nextMasterData) => { if (active) setMasterData(nextMasterData) })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'マスターデータを読み込めませんでした。')
      })
    Promise.all([loadTasks, loadConfig])
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!isFormOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsFormOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isFormOpen])

  async function saveTask(input: TaskInput) {
    setOperationError(null)
    if (editingTask) {
      const updatedTask = await taskClient.updateTask(editingTask.id, input)
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task))
    } else {
      const task = await taskClient.createTask(input)
      setTasks((current) => [...current, task])
    }
    setEditingTask(null)
    setIsFormOpen(false)
  }

  function closeTaskForm() {
    setIsFormOpen(false)
    setEditingTask(null)
  }

  async function toggleTask(task: Task, completed: boolean) {
    setOperationError(null)
    try {
      const updated = await taskClient.updateTask(task.id, {
        title: task.title,
        due_date: task.due_date,
        is_completed: completed,
        subject: task.subject,
        submission_type: task.submission_type,
        submission_link: task.submission_link,
        effort_level: task.effort_level,
      })
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : '課題の更新に失敗しました。')
    }
  }

  async function deleteTask(task: Task) {
    setOperationError(null)
    try {
      await taskClient.deleteTask(task.id)
      setTasks((current) => current.filter((item) => item.id !== task.id))
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : '課題を削除できませんでした。')
    }
  }

  return (
    <>
      <header className="tasks-header">
        <div>
          <h1 className="page-title">課題一覧</h1>
          <p className="page-description">未完了 {tasks.filter((task) => !task.is_completed).length} 件</p>
        </div>
        <button className="primary-button add-task-button" type="button" onClick={() => setIsFormOpen(true)}>
          <Plus size={17} />課題を追加
        </button>
      </header>
      {loadError && <div className="notice error"><AlertCircle size={17} />{loadError}</div>}
      {operationError && <div className="notice error"><AlertCircle size={17} />{operationError}</div>}
      {loading ? (
        <div className="task-loading"><span className="loader" />課題を読み込んでいます</div>
      ) : (
        <>
          <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} onEdit={(task) => { setEditingTask(task); setIsFormOpen(true) }} />
        </>
      )}
      {isFormOpen && (
        <div className="task-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTaskForm() }}>
          <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
            <header className="task-modal-header">
              <h2 id="task-modal-title">{editingTask ? '課題を編集' : '課題を追加'}</h2>
              <button className="icon-button modal-close" type="button" aria-label="閉じる" onClick={closeTaskForm}><X size={19} /></button>
            </header>
            {masterData ? <TaskForm key={editingTask?.id ?? 'new'} masterData={masterData} initialTask={editingTask} onSave={saveTask} /> : (
              <div className="modal-message">{loadError || '科目設定を読み込めませんでした。'}</div>
            )}
          </section>
        </div>
      )}
    </>
  )
}