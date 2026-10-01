package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"mytaketodo/backend/internal/discord"
	"mytaketodo/backend/internal/middleware"
	"mytaketodo/backend/internal/types"
)

type SettingsStore interface {
	Get(ctx context.Context, userID string) (types.UserSettings, error)
	Upsert(ctx context.Context, userID string, webhookURL *string) (types.UserSettings, error)
}

type SettingsHandler struct {
	settings SettingsStore
}

func NewSettingsHandler(settings SettingsStore) *SettingsHandler {
	return &SettingsHandler{settings: settings}
}

func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	settings, err := h.settings.Get(r.Context(), userID)
	if err != nil {
		log.Printf("get user settings: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

func (h *SettingsHandler) Put(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var input struct {
		DiscordWebhookURL *string `json:"discord_webhook_url"`
	}
	if err := decoder.Decode(&input); err != nil {
		http.Error(w, "invalid JSON request body", http.StatusBadRequest)
		return
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		http.Error(w, "request body must contain one JSON value", http.StatusBadRequest)
		return
	}
	if input.DiscordWebhookURL == nil {
		http.Error(w, "discord_webhook_url is required; use an empty string to clear it", http.StatusBadRequest)
		return
	}

	urlValue := strings.TrimSpace(*input.DiscordWebhookURL)
	var webhookURL *string
	if urlValue != "" {
		if err := discord.ValidateWebhookURL(urlValue); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		webhookURL = &urlValue
	}

	settings, err := h.settings.Upsert(r.Context(), userID, webhookURL)
	if err != nil {
		log.Printf("update user settings: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, settings)
}
