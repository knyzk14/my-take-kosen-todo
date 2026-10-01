package reminder

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"mytaketodo/backend/internal/discord"
)

const advisoryLockID int64 = 827341926105

type Notifier struct {
	db         *sql.DB
	httpClient *http.Client
}

type dueReminder struct {
	taskID            string
	userID            string
	title             string
	dueDate           time.Time
	effortLevel       int
	daysBefore        int
	discordWebhookURL string
}

func NewNotifier(db *sql.DB, client *http.Client) *Notifier {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	clientCopy := *client
	clientCopy.CheckRedirect = func(_ *http.Request, _ []*http.Request) error {
		return http.ErrUseLastResponse
	}
	return &Notifier{db: db, httpClient: &clientCopy}
}

func (notifier *Notifier) Run(ctx context.Context) error {
	conn, err := notifier.db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("acquire reminder lock connection: %w", err)
	}
	defer conn.Close()

	var locked bool
	if err := conn.QueryRowContext(ctx,
		`SELECT pg_try_advisory_lock($1)`, advisoryLockID,
	).Scan(&locked); err != nil {
		return fmt.Errorf("acquire reminder advisory lock: %w", err)
	}
	if !locked {
		return nil
	}
	defer func() {
		unlockCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if _, err := conn.ExecContext(unlockCtx, `SELECT pg_advisory_unlock($1)`, advisoryLockID); err != nil {
			log.Printf("release reminder advisory lock: %v", err)
		}
	}()

	reminders, err := notifier.findDueReminders(ctx)
	if err != nil {
		return err
	}

	var runErrors []error
	for _, reminder := range reminders {
		if err := ctx.Err(); err != nil {
			return errors.Join(append(runErrors, err)...)
		}

		sendErr := notifier.send(ctx, reminder)
		var sentAt *time.Time
		var lastError *string
		if sendErr == nil {
			now := time.Now().UTC()
			sentAt = &now
		} else {
			message := sendErr.Error()
			lastError = &message
		}
		if err := notifier.recordDelivery(ctx, reminder, sentAt, lastError); err != nil {
			runErrors = append(runErrors, fmt.Errorf("record reminder for task %s: %w", reminder.taskID, err))
		}
		if sendErr != nil {
			runErrors = append(runErrors, fmt.Errorf("send reminder for task %s: %w", reminder.taskID, sendErr))
		}
	}
	return errors.Join(runErrors...)
}

func (notifier *Notifier) RunPeriodically(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		log.Printf("reminder interval must be positive")
		return
	}

	run := func() {
		if err := notifier.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("reminder check failed: %v", err)
		}
	}
	run()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}

func (notifier *Notifier) findDueReminders(ctx context.Context) ([]dueReminder, error) {
	const query = `
		SELECT t.id::text, t.user_id, t.title, t.due_date, t.effort_level,
		       schedule.days_before, us.discord_webhook_url
		FROM tasks AS t
		JOIN user_settings AS us ON us.user_id = t.user_id
		CROSS JOIN (VALUES (1), (3), (7)) AS schedule(days_before)
		LEFT JOIN reminder_deliveries AS rd
		  ON rd.task_id = t.id AND rd.days_before = schedule.days_before
		WHERE t.is_completed = FALSE
		  AND us.discord_webhook_url IS NOT NULL
		  AND btrim(us.discord_webhook_url) <> ''
		  AND (rd.task_id IS NULL OR rd.sent_at IS NULL)
		  AND (
		       (t.effort_level = 3 AND schedule.days_before IN (1, 3, 7))
		    OR (t.effort_level = 2 AND schedule.days_before IN (1, 3))
		    OR (t.effort_level = 1 AND schedule.days_before = 1)
		  )
		  AND t.due_date > now()
		  AND t.due_date <= now() + schedule.days_before * interval '1 day'
		ORDER BY t.due_date, t.id, schedule.days_before`

	rows, err := notifier.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query due reminders: %w", err)
	}
	defer rows.Close()

	reminders := make([]dueReminder, 0)
	for rows.Next() {
		var reminder dueReminder
		if err := rows.Scan(
			&reminder.taskID,
			&reminder.userID,
			&reminder.title,
			&reminder.dueDate,
			&reminder.effortLevel,
			&reminder.daysBefore,
			&reminder.discordWebhookURL,
		); err != nil {
			return nil, fmt.Errorf("scan due reminder: %w", err)
		}
		reminders = append(reminders, reminder)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate due reminders: %w", err)
	}
	return reminders, nil
}

func (notifier *Notifier) send(ctx context.Context, reminder dueReminder) error {
	if err := discord.ValidateWebhookURL(reminder.discordWebhookURL); err != nil {
		return fmt.Errorf("invalid stored Discord webhook URL")
	}

	content := fmt.Sprintf(
		"課題の提出期限が%d日後です。\n課題: %s\n期限: %s\n大変度: %d/3",
		reminder.daysBefore,
		reminder.title,
		reminder.dueDate.Format(time.RFC3339),
		reminder.effortLevel,
	)
	body, err := json.Marshal(struct {
		Content string `json:"content"`
	}{Content: content})
	if err != nil {
		return fmt.Errorf("encode Discord message: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, reminder.discordWebhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create Discord request")
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := notifier.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("Discord request failed")
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("Discord returned HTTP %d", response.StatusCode)
	}
	return nil
}

func (notifier *Notifier) recordDelivery(ctx context.Context, reminder dueReminder, sentAt *time.Time, lastError *string) error {
	if lastError != nil && len(*lastError) > 1000 {
		truncated := strings.ToValidUTF8((*lastError)[:1000], "")
		lastError = &truncated
	}
	_, err := notifier.db.ExecContext(ctx,
		`INSERT INTO reminder_deliveries
			(task_id, user_id, days_before, sent_at, attempt_count, last_error)
		 VALUES ($1::uuid, $2, $3, $4, 1, $5)
		 ON CONFLICT (task_id, days_before) DO UPDATE
		 SET sent_at = EXCLUDED.sent_at,
		     attempt_count = reminder_deliveries.attempt_count + 1,
		     last_error = EXCLUDED.last_error`,
		reminder.taskID,
		reminder.userID,
		reminder.daysBefore,
		sentAt,
		lastError,
	)
	if err != nil {
		return fmt.Errorf("upsert reminder delivery: %w", err)
	}
	return nil
}
