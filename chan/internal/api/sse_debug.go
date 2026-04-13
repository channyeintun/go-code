package api

import (
	"io"

	"github.com/channyeintun/chan/internal/debuglog"
)

// sseBodyWithDebug wraps an io.Reader with debug logging when enabled.
func sseBodyWithDebug(body io.Reader, provider string) io.Reader {
	return debuglog.NewSSEReaderProxy(body, provider)
}
