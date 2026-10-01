package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"mytaketodo/backend/internal/types"
)

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (repo *SettingsRepository) Get(ctx context.Context, userID string) (types.UserSettings, error) {
	var settings types.UserSettings
	err := repo.db.QueryRowContext(ctx,
		`SELECT discord_webhook_url, updated_at
		 FROM user_settings
		 WHERE user_id = $1`,
		userID,
	).Scan(&settings.DiscordWebhookURL, &settings.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return types.UserSettings{}, nil
	}
	if err != nil {
		return types.UserSettings{}, fmt.Errorf("get user settings: %w", err)
	}
	return settings, nil
}

func (repo *SettingsRepository) Upsert(ctx context.Context, userID string, webhookURL *string) (types.UserSettings, error) {
	var settings types.UserSettings
	err := repo.db.QueryRowContext(ctx,
		`INSERT INTO user_settings (user_id, discord_webhook_url)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE
		 SET discord_webhook_url = EXCLUDED.discord_webhook_url,
		     updated_at = now()
		 RETURNING discord_webhook_url, updated_at`,
		userID,
		webhookURL,
	).Scan(&settings.DiscordWebhookURL, &settings.UpdatedAt)
	if err != nil {
		return types.UserSettings{}, fmt.Errorf("upsert user settings: %w", err)
	}
	return settings, nil
}
