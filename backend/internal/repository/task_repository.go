package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	tasktypes "mytaketodo/backend/internal/types"
)

var ErrNotFound = errors.New("task not found")

type TaskRepository struct {
	db *sql.DB
}

func NewTaskRepository(db *sql.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

const taskColumns = `id::text, title, due_date, is_completed, subject,
	submission_type, submission_link, effort_level, created_at, updated_at`

func (repo *TaskRepository) Create(ctx context.Context, userID string, input tasktypes.CreateTaskInput) (tasktypes.Task, error) {
	query := `INSERT INTO tasks
		(user_id, title, due_date, is_completed, subject, submission_type, submission_link, effort_level)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ` + taskColumns

	var task tasktypes.Task
	err := repo.db.QueryRowContext(ctx, query,
		userID,
		input.Title,
		input.DueDate,
		input.IsCompleted,
		input.Subject,
		input.SubmissionType,
		input.SubmissionLink,
		input.EffortLevel,
	).Scan(
		&task.ID,
		&task.Title,
		&task.DueDate,
		&task.IsCompleted,
		&task.Subject,
		&task.SubmissionType,
		&task.SubmissionLink,
		&task.EffortLevel,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if err != nil {
		return tasktypes.Task{}, fmt.Errorf("create task: %w", err)
	}
	return task, nil
}

func (repo *TaskRepository) List(ctx context.Context, userID string) ([]tasktypes.Task, error) {
	query := `SELECT ` + taskColumns + `
		FROM tasks
		WHERE user_id = $1
		ORDER BY due_date, id`

	rows, err := repo.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	tasks := make([]tasktypes.Task, 0)
	for rows.Next() {
		var task tasktypes.Task
		if err := rows.Scan(
			&task.ID,
			&task.Title,
			&task.DueDate,
			&task.IsCompleted,
			&task.Subject,
			&task.SubmissionType,
			&task.SubmissionLink,
			&task.EffortLevel,
			&task.CreatedAt,
			&task.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan task: %w", err)
		}
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tasks: %w", err)
	}
	return tasks, nil
}

func (repo *TaskRepository) Get(ctx context.Context, userID, taskID string) (tasktypes.Task, error) {
	query := `SELECT ` + taskColumns + `
		FROM tasks
		WHERE id = $1::uuid AND user_id = $2`

	var task tasktypes.Task
	err := repo.db.QueryRowContext(ctx, query, taskID, userID).Scan(
		&task.ID,
		&task.Title,
		&task.DueDate,
		&task.IsCompleted,
		&task.Subject,
		&task.SubmissionType,
		&task.SubmissionLink,
		&task.EffortLevel,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return tasktypes.Task{}, ErrNotFound
	}
	if err != nil {
		return tasktypes.Task{}, fmt.Errorf("get task: %w", err)
	}
	return task, nil
}

func (repo *TaskRepository) Update(ctx context.Context, userID, taskID string, input tasktypes.UpdateTaskInput) (tasktypes.Task, error) {
	query := `UPDATE tasks
		SET title = $3,
			due_date = $4,
			is_completed = $5,
			subject = $6,
			submission_type = $7,
			submission_link = $8,
			effort_level = $9,
			updated_at = now()
		WHERE id = $1::uuid AND user_id = $2
		RETURNING ` + taskColumns

	var task tasktypes.Task
	err := repo.db.QueryRowContext(ctx, query,
		taskID,
		userID,
		input.Title,
		input.DueDate,
		input.IsCompleted,
		input.Subject,
		input.SubmissionType,
		input.SubmissionLink,
		input.EffortLevel,
	).Scan(
		&task.ID,
		&task.Title,
		&task.DueDate,
		&task.IsCompleted,
		&task.Subject,
		&task.SubmissionType,
		&task.SubmissionLink,
		&task.EffortLevel,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return tasktypes.Task{}, ErrNotFound
	}
	if err != nil {
		return tasktypes.Task{}, fmt.Errorf("update task: %w", err)
	}
	return task, nil
}

func (repo *TaskRepository) Delete(ctx context.Context, userID, taskID string) error {
	result, err := repo.db.ExecContext(ctx,
		`DELETE FROM tasks WHERE id = $1::uuid AND user_id = $2`,
		taskID,
		userID,
	)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("check deleted task: %w", err)
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
