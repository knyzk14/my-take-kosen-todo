package reminder

import (
	"database/sql"
	"strings"
	"testing"
	"time"
)

func TestBuildDiscordEmbedUsesTaskDetailsAndEffortColor(t *testing.T) {
	reminder := dueReminder{
		title:          "数学の課題",
		subject:        "数学",
		submissionType: "Google Classroom",
		submissionLink: sql.NullString{String: "https://classroom.google.com/task", Valid: true},
		dueDate:        time.Date(2026, time.October, 10, 5, 0, 0, 0, time.UTC),
		effortLevel:    3,
		daysBefore:     3,
	}

	embed := buildDiscordEmbed(reminder)
	if embed.Title != reminder.title {
		t.Fatalf("Title = %q, want %q", embed.Title, reminder.title)
	}
	if embed.Color != 0xDC2626 {
		t.Fatalf("Color = %d, want %d", embed.Color, 0xDC2626)
	}
	if len(embed.Fields) != 3 || embed.Fields[0].Value != "数学" || embed.Fields[1].Value != "Google Classroom" {
		t.Fatalf("unexpected embed fields: %#v", embed.Fields)
	}
	if embed.Description == "" || !strings.Contains(embed.Description, "2026年10月10日 14:00") || !strings.Contains(embed.Description, "https://classroom.google.com/task") {
		t.Fatalf("unexpected description: %q", embed.Description)
	}
}
