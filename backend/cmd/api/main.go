package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mytaketodo/backend/internal/handler"
	"mytaketodo/backend/internal/middleware"
	"mytaketodo/backend/internal/reminder"
	"mytaketodo/backend/internal/repository"

	firebase "firebase.google.com/go/v4"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	dbCtx, cancelDB := context.WithTimeout(ctx, 10*time.Second)
	defer cancelDB()
	if err := db.PingContext(dbCtx); err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}

	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		return fmt.Errorf("initialize Firebase app: %w", err)
	}
	authClient, err := app.Auth(ctx)
	if err != nil {
		return fmt.Errorf("initialize Firebase Auth: %w", err)
	}

	masterDataPath := os.Getenv("MASTER_DATA_PATH")
	if masterDataPath == "" {
		masterDataPath = "internal/config/master_data.json"
	}

	mux := http.NewServeMux()
	authMiddleware := middleware.Auth(authClient)
	mux.Handle("GET /api/config", authMiddleware(handler.Config(masterDataPath)))
	taskHandler := handler.NewTaskHandler(repository.NewTaskRepository(db))
	mux.Handle("GET /api/tasks", authMiddleware(http.HandlerFunc(taskHandler.List)))
	mux.Handle("POST /api/tasks", authMiddleware(http.HandlerFunc(taskHandler.Create)))
	mux.Handle("GET /api/tasks/{id}", authMiddleware(http.HandlerFunc(taskHandler.Get)))
	mux.Handle("PUT /api/tasks/{id}", authMiddleware(http.HandlerFunc(taskHandler.Update)))
	mux.Handle("DELETE /api/tasks/{id}", authMiddleware(http.HandlerFunc(taskHandler.Delete)))
	settingsHandler := handler.NewSettingsHandler(repository.NewSettingsRepository(db))
	mux.Handle("GET /api/settings", authMiddleware(http.HandlerFunc(settingsHandler.Get)))
	mux.Handle("PUT /api/settings", authMiddleware(http.HandlerFunc(settingsHandler.Put)))

	jobDone := make(chan struct{})
	notifier := reminder.NewNotifier(db, &http.Client{Timeout: 10 * time.Second})
	go func() {
		defer close(jobDone)
		notifier.RunPeriodically(ctx, time.Hour)
	}()
	defer func() {
		stop()
		<-jobDone
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("API listening on %s", server.Addr)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("serve HTTP: %w", err)
		}
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("shutdown HTTP server: %w", err)
		}
	}

	return nil
}
