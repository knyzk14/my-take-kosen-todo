package types

import "time"

type Task struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	DueDate        time.Time `json:"due_date"`
	IsCompleted    bool      `json:"is_completed"`
	Subject        string    `json:"subject"`
	SubmissionType string    `json:"submission_type"`
	SubmissionLink *string   `json:"submission_link"`
	EffortLevel    int       `json:"effort_level"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type TaskFields struct {
	Title          string    `json:"title"`
	DueDate        time.Time `json:"due_date"`
	Subject        string    `json:"subject"`
	SubmissionType string    `json:"submission_type"`
	SubmissionLink *string   `json:"submission_link"`
	EffortLevel    int       `json:"effort_level"`
}

type CreateTaskInput struct {
	TaskFields
	IsCompleted bool `json:"is_completed"`
}

type UpdateTaskInput struct {
	TaskFields
	IsCompleted bool `json:"is_completed"`
}
