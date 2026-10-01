package discord

import (
	"fmt"
	"net/url"
	"strings"
)

func ValidateWebhookURL(raw string) error {
	parsed, err := url.ParseRequestURI(raw)
	if err != nil {
		return fmt.Errorf("invalid webhook URL")
	}
	if parsed.Scheme != "https" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return fmt.Errorf("webhook URL must be a Discord HTTPS webhook URL")
	}
	host := strings.ToLower(parsed.Hostname())
	if (host != "discord.com" && host != "discordapp.com") || (parsed.Port() != "" && parsed.Port() != "443") {
		return fmt.Errorf("webhook URL must use discord.com or discordapp.com")
	}
	segments := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(segments) != 4 || segments[0] != "api" || segments[1] != "webhooks" || segments[2] == "" || segments[3] == "" {
		return fmt.Errorf("invalid Discord webhook path")
	}
	return nil
}
