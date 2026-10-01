package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"mytaketodo/backend/internal/middleware"
	"mytaketodo/backend/internal/repository"
	tasktypes "mytaketodo/backend/internal/types"
)

type TaskStore interface {
	Create(ctx context.Context, userID string, input tasktypes.CreateTaskInput) (tasktypes.Task, error)
	List(ctx context.Context, userID string) ([]tasktypes.Task, error)
	Get(ctx context.Context, userID, taskID string) (tasktypes.Task, error)
	Update(ctx context.Context, userID, taskID string, input tasktypes.UpdateTaskInput) (tasktypes.Task, error)
	Delete(ctx context.Context, userID, taskID string) error
}

type TaskHandler struct {
	tasks TaskStore
}

func NewTaskHandler(tasks TaskStore) *TaskHandler {
	return &TaskHandler{tasks: tasks}
}

func (h *TaskHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	tasks, err := h.tasks.List(r.Context(), userID)
	if err != nil {
		writeTaskError(w, "list", err)
		return
	}
	writeJSON(w, http.StatusOK, tasks)
}

func (h *TaskHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var input tasktypes.CreateTaskInput
	if !decodeTaskInput(w, r, &input) {
		return
	}
	normalizeTaskFields(&input.TaskFields)
	if err := validateTaskFields(input.TaskFields); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	task, err := h.tasks.Create(r.Context(), userID, input)
	if err != nil {
		writeTaskError(w, "create", err)
		return
	}
	w.Header().Set("Location", "/api/tasks/"+task.ID)
	writeJSON(w, http.StatusCreated, task)
}

func (h *TaskHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	taskID, ok := parseTaskID(w, r)
	if !ok {
		return
	}

	task, err := h.tasks.Get(r.Context(), userID, taskID)
	if err != nil {
		writeTaskError(w, "get", err)
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func (h *TaskHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	taskID, ok := parseTaskID(w, r)
	if !ok {
		return
	}

	var input tasktypes.UpdateTaskInput
	if !decodeTaskInput(w, r, &input) {
		return
	}
	normalizeTaskFields(&input.TaskFields)
	if err := validateTaskFields(input.TaskFields); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	task, err := h.tasks.Update(r.Context(), userID, taskID, input)
	if err != nil {
		writeTaskError(w, "update", err)
		return
	}
	writeJSON(w, http.StatusOK, task)
}

func (h *TaskHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	taskID, ok := parseTaskID(w, r)
	if !ok {
		return
	}

	if err := h.tasks.Delete(r.Context(), userID, taskID); err != nil {
		writeTaskError(w, "delete", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func decodeTaskInput(w http.ResponseWriter, r *http.Request, target any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		http.Error(w, "invalid JSON request body", http.StatusBadRequest)
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		http.Error(w, "request body must contain one JSON value", http.StatusBadRequest)
		return false
	}
	return true
}

func normalizeTaskFields(fields *tasktypes.TaskFields) {
	fields.Title = strings.TrimSpace(fields.Title)
	fields.Subject = strings.TrimSpace(fields.Subject)
	fields.SubmissionType = strings.TrimSpace(fields.SubmissionType)
	if fields.SubmissionLink != nil {
		link := strings.TrimSpace(*fields.SubmissionLink)
		if link == "" {
			fields.SubmissionLink = nil
		} else {
			fields.SubmissionLink = &link
		}
	}
}

func validateTaskFields(fields tasktypes.TaskFields) error {
	if fields.Title == "" || utf8.RuneCountInString(fields.Title) > 500 {
		return fmt.Errorf("title is required and must be at most 500 characters")
	}
	if fields.DueDate.IsZero() {
		return fmt.Errorf("due_date is required")
	}
	if fields.Subject == "" || utf8.RuneCountInString(fields.Subject) > 100 {
		return fmt.Errorf("subject is required and must be at most 100 characters")
	}
	if fields.SubmissionType == "" || utf8.RuneCountInString(fields.SubmissionType) > 100 {
		return fmt.Errorf("submission_type is required and must be at most 100 characters")
	}
	if fields.EffortLevel < 1 || fields.EffortLevel > 3 {
		return fmt.Errorf("effort_level must be between 1 and 3")
	}
	return nil
}

func parseTaskID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return "", false
	}
	return id.String(), true
}

func writeTaskError(w http.ResponseWriter, operation string, err error) {
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "task not found", http.StatusNotFound)
		return
	}
	log.Printf("%s task: %v", operation, err)
	http.Error(w, "internal server error", http.StatusInternalServerError)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write JSON response: %v", err)
	}
}
