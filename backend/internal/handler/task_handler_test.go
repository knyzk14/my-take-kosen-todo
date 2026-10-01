package handler

import (
	"net/http/httptest"
	"strings"
	"testing"

	tasktypes "mytaketodo/backend/internal/types"
)

func TestDecodeCreateTaskAcceptsCompletedField(t *testing.T) {
	body := `{"title":" p.37-39 自律神経による心臓の拍動の調節","due_date":"2026-10-07T14:59:00.000Z","subject":"理科","submission_type":"Google Classroom","submission_link":"https://classroom.google.com/c/ODU2NDA4MTQ2ODIw/a/ODczNjQ4MzM1MTk5/details","effort_level":2,"is_completed":false}`
	request := httptest.NewRequest("POST", "/api/tasks", strings.NewReader(body))
	response := httptest.NewRecorder()
	var input tasktypes.CreateTaskInput

	if !decodeTaskInput(response, request, &input) {
		t.Fatalf("decodeTaskInput rejected payload: status=%d body=%s", response.Code, response.Body.String())
	}
	if input.IsCompleted {
		t.Fatal("is_completed should be false")
	}
	if input.Title != " p.37-39 自律神経による心臓の拍動の調節" {
		t.Fatalf("unexpected title: %q", input.Title)
	}
}
