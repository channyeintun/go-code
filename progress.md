# Progress

## Active Task

- In progress: planning structured debug logs and a live monitor flow for `/debug`.

## Notes

- Reviewed the current debug logging path in `chan/internal/debuglog`.
- Confirmed the existing logger already writes one JSON object per line to the session debug log.
- Confirmed slash commands are handled in `chan/cmd/chan/slash_command_handlers.go` and cataloged in `chan/cmd/chan/slash_commands.go`.
- Confirmed the TUI sends slash commands through `chan/tui/src/hooks/useEngine.ts`.
- Confirmed macOS process launch via `osascript` already exists in the TUI utilities and can be reused for a terminal popup design.
- Decided the canonical live format should remain JSONL, with CSV or YAML only as downstream transforms if needed.
- No implementation has started yet.
