# Plan

## Goal

Design a structured debug logging pipeline and a live monitoring flow so `/debug` can open a separate terminal popup that streams machine-readable logs for the current session.

## Reference Notes

- `chan/internal/debuglog/logger.go`: current debug logging already writes JSONL-style entries to a per-session `debug.log` file.
- `chan/internal/debuglog/bridge_proxy.go`: IPC frames are already intercepted at the logger boundary and can be upgraded to a typed schema.
- `chan/internal/debuglog/sse_reader.go`: provider SSE traffic is already proxied and should emit into the same normalized envelope.
- `chan/cmd/chan/slash_command_handlers.go`: slash command handling lives in the Go engine, so `/debug` should be added here.
- `chan/cmd/chan/slash_commands.go`: slash command catalog and help text need `/debug` descriptor coverage.
- `chan/tui/src/hooks/useEngine.ts`: the TUI already sends slash commands to the engine over IPC.
- `sourcecode/bridge/debugUtils.ts`: redaction and truncation should be applied before broadening the live log stream.
- `chan/tui/src/utils/imagePaste.ts`: macOS AppleScript process launching exists already and is a viable pattern for opening a separate Terminal window.

## Design Decisions

1. Use JSONL as the canonical live log format. Do not make CSV or YAML the primary stream format.
2. Introduce a versioned event envelope with stable top-level fields such as `schema_version`, `ts`, `session_id`, `source`, `component`, `category`, `event`, `level`, `seq`, `metrics`, `data`, and `error`.
3. Keep event-specific payload inside `data` so monitoring tools can parse a predictable schema while preserving flexibility.
4. Add centralized redaction and truncation for secrets, tokens, raw prompts, and oversized payloads.
5. Keep the first live monitor implementation file-backed by tailing the per-session JSONL log rather than inventing a new socket stream.
6. Scope `/debug` to the active session so the popup always follows the current session log file.

## Tasks

1. Normalize the debug logger around a typed event envelope in `chan/internal/debuglog` while preserving existing emission points.
2. Define the session metadata and sequence numbering strategy so all log lines are traceable and ordered.
3. Design the `/debug` slash command contract, including default behavior and subcommands such as `status`, `path`, and `off`.
4. Design an IPC handoff from engine to TUI so the engine requests a monitor popup and the launcher owns OS-specific terminal spawning.
5. Design a dedicated `debug-view` monitor entrypoint that renders a compact live log UI for the tailed JSONL stream.
6. Define the monitor UX: rolling rows, level/component/event filters, compact summary column, full-event inspection, and basic live counters.
7. Document external monitoring pipelines using the same JSONL stream.

## Implementation Order

1. Phase 1: schema normalization, redaction, and compatibility plan for the current `debug.log` output.
2. Phase 2: `/debug` slash command wiring in the Go engine and IPC event design.
3. Phase 3: macOS terminal popup launcher plus standalone live monitor command.
4. Phase 4: documentation and operational examples for piping logs into monitoring tools.

## Constraints

1. Do not add tests.
2. Do not begin implementation until this plan is accepted.
3. Follow the repo workflow in `progress.md` for future implementation tasks.
