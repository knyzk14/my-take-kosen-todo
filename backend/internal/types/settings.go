package types

import "time"

type UserSettings struct {
	DiscordWebhookURL *string   `json:"discord_webhook_url"`
	UpdatedAt         time.Time `json:"updated_at,omitempty"`
}
