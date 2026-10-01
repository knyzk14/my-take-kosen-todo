package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type MasterData struct {
	Subjects        []Subject        `json:"subjects"`
	SubmissionTypes []SubmissionType `json:"submission_types"`
}

type Subject struct {
	Name     string   `json:"name"`
	Keywords []string `json:"keywords"`
}

type SubmissionType struct {
	Name    string   `json:"name"`
	Domains []string `json:"domains"`
}

func Config(dataPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		file, err := os.Open(dataPath)
		if err != nil {
			log.Printf("open master data: %v", err)
			http.Error(w, "configuration unavailable", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		var data MasterData
		if err := json.NewDecoder(file).Decode(&data); err != nil {
			log.Printf("decode master data: %v", err)
			http.Error(w, "configuration unavailable", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		if err := json.NewEncoder(w).Encode(data); err != nil {
			log.Printf("write config response: %v", err)
		}
	}
}
