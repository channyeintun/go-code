# Progress

## Working Rules

- Follow [plan.md](/Users/channyeintun/Documents/go-code/plan.md) as the execution baseline.
- Reference the matching implementation in `sourcecode/` before changing feature behavior in `go-cli/tui`.
- Do not add tests.
- After each completed task: update this file, run formatting, and create a git commit.

## Current Status

| Phase | Scope                                   | Status      | Notes                  |
| ----- | --------------------------------------- | ----------- | ---------------------- |
| 1     | Layout and prompt foundation            | not started | Pending implementation |
| 2     | Permission UX parity                    | not started | Pending phase 1        |
| 3     | Markdown and syntax highlighting parity | not started | Pending phase 2        |

## Scope

| 5a | Status line parity | not started | Pending phase 4 |

- Follow the current [plan.md](/Users/channyeintun/Documents/go-code/plan.md).
- Reference `sourcecode/` first for each feature or behavior change.

## Task Log

### 2026-04-10

| Phase                                      | Status      | Notes                                                                                                                                                                    |
| ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Layout and prompt foundation            | in progress | Upstream prompt/input references identified in `sourcecode/hooks/useTextInput.ts`, `sourcecode/hooks/useArrowKeyHistory.tsx`, and `sourcecode/components/TextInput.tsx`. |
| 2. Permission UX parity                    | not started | Waiting for Phase 1 completion.                                                                                                                                          |
| 3. Markdown and syntax highlighting parity | not started | Waiting for Phase 2 completion.                                                                                                                                          |
| 4. Transcript/message-row parity           | not started | Waiting for Phase 3 completion.                                                                                                                                          |
| 5a. Status line parity                     | not started | Waiting for Phase 4 completion.                                                                                                                                          |
| 5b. Prompt footer parity                   | not started | Waiting for Phase 5a completion.                                                                                                                                         |
| 6. Protocol follow-up                      | not started | Only if parity requires engine changes.                                                                                                                                  |

- Implemented Phase 4 groundwork by enriching file write/edit tool results with inline change metadata and short diff previews, then rendering those previews in the TUI transcript.
- Implemented Phase 3 of `plan.md` by replacing generic tool transcript summaries with tool-aware renderers for bash, file operations, grep/glob, git, and web tools.
- Kept the sourcecode-style inline transcript layout while making tool rows describe the operation more clearly across running, waiting, success, and failure states.
- Implemented Phase 2 of `plan.md` against upstream sourcecode references by rendering tool-use entries inline in the transcript instead of in a separate floating widget.
- Added transcript ordering state in `useEvents` so user messages, tool calls, and assistant messages render in event order during a turn.
- Completed: removed stale unrelated history from this tracker and reset it to the current parity plan only.
- Completed: referenced the upstream prompt/input implementation in `sourcecode/hooks/useTextInput.ts`, `sourcecode/hooks/useArrowKeyHistory.tsx`, and `sourcecode/components/TextInput.tsx` before changing the TUI.
- Completed: landed the first Phase 1 slice in `go-cli/tui` with cursor-aware editing, multiline input via Shift+Enter or Meta+Enter, word and line movement, and a bordered prompt container/footer.
- Remaining in Phase 1: wrapped-line cursor movement parity, clipboard image paste, and fuller prompt footer behavior.

- [x] `file_history.go` — SHA-256 content-addressed backup store, snapshot/rewind support
- [x] Track file state before write/edit operations
- [x] Snapshot creation and rewind to any checkpoint
- [x] Diff stats between snapshot and current state
- [x] Wire into file_write and file_edit tools via global tracker

---

## Summary

| Area           | Scaffolded                 | Wired/Working                                                                                              |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| IPC Protocol   | ✅                         | ✅                                                                                                         |
| API Interfaces | ✅                         | ⚠️ (Anthropic + OpenAI-compatible + Gemini + Ollama clients implemented)                                   |
| Agent Loop     | ✅                         | ✅ (live turn loop with model streaming and tool handoff)                                                  |
| Tools          | ✅ (framework)             | ⚠️ (bash + file read/write/edit/glob/grep implemented; remaining tools pending)                            |
| Compaction     | ✅ (Strategies A+B+C done) | ⚠️ (proactive compaction now wired; tests remain pending)                                                  |
| Permissions    | ✅                         | ✅ (stdio permission prompts + session allow rules)                                                        |
| Cost Tracking  | ✅                         | ✅ (API usage, token totals, tool duration, TUI updates)                                                   |
| Hooks          | ✅                         | ✅ (pre/post tool + session_start wired; compaction hooks pending)                                         |
| Artifacts      | ✅                         | ✅ (markdown-backed plan artifacts + tool-log spillover wired)                                             |
| Session        | ✅                         | ✅ (live save + restore + title generation wired)                                                          |
| Config         | ✅                         | ✅                                                                                                         |
| Skills         | ✅                         | ✅ (auto-select matching skills and inject their markdown instructions per turn)                           |
| Local Model    | ✅                         | ✅ (Ollama Query + compaction routing + session title generation wired)                                    |
| Ink TUI        | ✅                         | ✅ (default CLI launches Ink parent, Go child over NDJSON; status/permission/artifact rendering validated) |
| CLI Entrypoint | ✅                         | ✅ (live stdio engine)                                                                                     |
| Memory Files   | ✅                         | ✅ (CLAUDE.md + .claude/rules + CLAUDE.local.md hierarchy loading wired)                                   |
| File History   | ✅                         | ✅ (content-addressed backup + snapshot/rewind wired into file write/edit)                                 |

**Current state:** All four provider clients, the Bash tool, and the file read/write/edit/glob/grep/web_search/web_fetch/git tools are implemented, along with the streaming executor needed to overlap safe tool calls. The default CLI path now launches the Ink frontend as the parent process and runs the Go engine as a stdio child over NDJSON, with status, artifact, compaction, permission/error states, preserved conversation history, and live assistant/tool activity rendered in the TUI while the engine remains recoverable if the configured model is unavailable at startup. The stdio engine persists and restores transcript + session metadata, generates session titles via local model after the first query, supports runtime `/model` switching, exposes `/plan`, `/fast`, `/compact`, `/model`, `/cost`, `/usage`, `/resume`, `/clear`, `/help`, `/status`, `/sessions`, and `/diff` over the stdio command path, emits markdown-backed implementation-plan/tool-log artifacts during planning and oversized tool execution, keeps plan mode read-only through planner enforcement, loads CLAUDE.md/CLAUDE.local.md/.claude/rules/\*.md project instruction files into the system prompt, tracks file edit history for undo/rewind with content-addressed backups, fires pre/post-tool and session lifecycle hooks from ~/.config/go-cli/hooks/, and now shapes requests by model capability: native tool definitions are withheld for text-only models, `ultrathink` only enables extended thinking on supported models, context thresholds already track each model's window, and tool-output budgets scale with model output capacity.
