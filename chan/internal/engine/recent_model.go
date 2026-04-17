package engine

import (
	"strings"

	"github.com/channyeintun/chan/internal/config"
)

func rememberSuccessfulModelSelection(modelID string) {
	modelID = strings.TrimSpace(modelID)
	if modelID == "" {
		return
	}
	_ = config.SaveRecentModelSelection(modelID)
}
