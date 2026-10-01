import { useEffect, useState } from 'react'
import { AlertCircle, CalendarDays, ClipboardList } from 'lucide-react'
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

  async function createTask(input: TaskInput) {
    setOperationError(null)
    const task = await taskClient.createTask(input)
    setTasks((current) => [...current, task])
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
      <div className="page-kicker"><CalendarDays size={15} /> MY WORKSPACE</div>
      <h1 className="page-title">課題一覧</h1>
      <p className="page-description">提出期限と、これから取り組む課題をここで管理します。完了 {tasks.filter((task) => task.is_completed).length} / {tasks.length}</p>
      <hr className="section-rule" />
      {loadError && <div className="notice error"><AlertCircle size={17} />{loadError}</div>}
      {operationError && <div className="notice error"><AlertCircle size={17} />{operationError}</div>}
      {loading ? (
        <div className="task-loading"><span className="loader" />課題を読み込んでいます</div>
      ) : (
        <>
          {masterData && <TaskForm masterData={masterData} onCreate={createTask} />}
          {!masterData && !loadError && <div className="notice error"><AlertCircle size={17} />科目設定を読み込めませんでした。</div>}
          <div className="task-list-heading">
            <div><ClipboardList size={17} /><h2>登録済みの課題</h2></div>
            <span>{tasks.length} 件</span>
          </div>
          <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />
        </>
      )}
    </>
  )
}