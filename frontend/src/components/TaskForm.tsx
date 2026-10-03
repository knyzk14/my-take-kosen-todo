import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { MasterData } from '../api/configClient'
import type { Task, TaskFields, TaskInput } from '../types/task'

type TaskFormProps = {
  masterData: MasterData
  initialTask?: Task | null
  onSave: (task: TaskInput) => Promise<void>
}

function initialFields(task?: Task | null): TaskFields {
  if (task) {
    const dueDate = new Date(task.due_date)
    return {
      title: task.title,
      due_date: new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
      subject: task.subject,
      submission_type: task.submission_type,
      submission_link: task.submission_link,
      effort_level: task.effort_level,
    }
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 1)
  dueDate.setHours(23, 59, 0, 0)
  return {
    title: '',
    due_date: new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
    subject: '',
    submission_type: '',
    submission_link: '',
    effort_level: 2,
  }
}

export function TaskForm({ masterData, initialTask = null, onSave }: TaskFormProps) {
  const [fields, setFields] = useState<TaskFields>(() => initialFields(initialTask))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const automaticSubject = useRef<string | null>(null)
  const automaticSubmissionType = useRef<string | null>(null)
  const hasEditedTitle = useRef(false)
  const hasEditedLink = useRef(false)

  useEffect(() => {
    if (initialTask && !hasEditedTitle.current) return
    const title = fields.title.toLocaleLowerCase()
    const match = masterData.subjects.find((subject) =>
      subject.keywords.some((keyword) => keyword && title.includes(keyword.toLocaleLowerCase())),
    )
    const previousAutomatic = automaticSubject.current
    automaticSubject.current = match?.name ?? null
    setFields((current) => {
      const subjectWasAutomatic = previousAutomatic !== null && current.subject === previousAutomatic
      if (match) return current.subject === match.name ? current : { ...current, subject: match.name }
      return subjectWasAutomatic ? { ...current, subject: '' } : current
    })
  }, [fields.title, initialTask, masterData.subjects])

  useEffect(() => {
    if (initialTask && !hasEditedLink.current) return
    let match: MasterData['submission_types'][number] | undefined
    try {
      const hostname = new URL(fields.submission_link || '').hostname.toLocaleLowerCase()
      match = masterData.submission_types.find((submissionType) =>
        submissionType.domains.some((domain) => {
          const normalizedDomain = domain.toLocaleLowerCase()
          return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`)
        }),
      )
    } catch {
      match = undefined
    }

    const previousAutomatic = automaticSubmissionType.current
    automaticSubmissionType.current = match?.name ?? null
    setFields((current) => {
      const typeWasAutomatic = previousAutomatic !== null && current.submission_type === previousAutomatic
      if (match) return current.submission_type === match.name ? current : { ...current, submission_type: match.name }
      return typeWasAutomatic ? { ...current, submission_type: '' } : current
    })
  }, [fields.submission_link, initialTask, masterData.submission_types])

  function update<K extends keyof TaskFields>(key: K, value: TaskFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSave({
        ...fields,
        due_date: new Date(fields.due_date).toISOString(),
        submission_link: fields.submission_link?.trim() || null,
        is_completed: initialTask?.is_completed ?? false,
      })
      setFields(initialFields())
      automaticSubject.current = null
      automaticSubmissionType.current = null
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '課題を保存できませんでした。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="task-form-panel" aria-label="課題を追加">
      <form className="task-form" onSubmit={submit}>
        <label className="task-field task-field-wide">
          <span>課題名</span>
          <input required maxLength={500} value={fields.title} onChange={(event) => { hasEditedTitle.current = true; update('title', event.target.value) }} placeholder="例: 数学II 問題集 p.42" />
        </label>
        <label className="task-field">
          <span>教科</span>
          <select required value={fields.subject} onChange={(event) => { automaticSubject.current = null; update('subject', event.target.value) }}>
            <option value="" disabled>教科を選択</option>
            {masterData.subjects.map((subject) => <option key={subject.name} value={subject.name}>{subject.name}</option>)}
          </select>
        </label>
        <label className="task-field">
          <span>提出期限</span>
          <input required type="datetime-local" value={fields.due_date} onChange={(event) => update('due_date', event.target.value)} />
        </label>
        <label className="task-field">
          <span>提出方法</span>
          <select required value={fields.submission_type} onChange={(event) => { automaticSubmissionType.current = null; update('submission_type', event.target.value) }}>
            <option value="" disabled>提出方法を選択</option>
            {masterData.submission_types.map((submissionType) => <option key={submissionType.name} value={submissionType.name}>{submissionType.name}</option>)}
          </select>
        </label>
        <label className="task-field">
          <span>提出先URL <small>任意</small></span>
          <input type="url" value={fields.submission_link || ''} onChange={(event) => { hasEditedLink.current = true; update('submission_link', event.target.value) }} placeholder="https://..." />
        </label>
        <fieldset className="task-field task-effort">
          <legend>大変度</legend>
          <div className="effort-options">
            {([
              { value: 1, label: '軽い' },
              { value: 2, label: '普通' },
              { value: 3, label: '重い' },
            ] as const).map((option) => (
              <label className={`effort-option${fields.effort_level === option.value ? ' selected' : ''}`} key={option.value}>
                <input type="radio" name="effort-level" value={option.value} checked={fields.effort_level === option.value} onChange={() => update('effort_level', option.value)} />
                <span className="effort-dots" aria-hidden="true">{'●'.repeat(option.value)}{'○'.repeat(3 - option.value)}</span>
                <span className="effort-label">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="task-form-error" role="alert">{error}</p>}
        <div className="task-form-footer">
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? '保存中...' : initialTask ? '変更を保存' : '追加'}
          </button>
        </div>
      </form>
    </section>
  )
}