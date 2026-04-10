# Tool Use Parity Plan

## Goal

Bring `go-cli/tui` tool-use behavior closer to the upstream `sourcecode` TUI, with the original sourcecode implementation used as the primary reference for behavior and rendering.

## Source References

- `sourcecode/components/messages/AssistantToolUseMessage.tsx`: main tool-use row state machine and rendering model.
- `sourcecode/components/messages/GroupedToolUseContent.tsx`: grouped tool-use rendering for tools that want aggregation.
- `sourcecode/components/ToolUseLoader.tsx`: queued/in-progress/resolved/error indicator behavior.
- `sourcecode/components/FileEditToolDiff.tsx`: structured preview diff rendering.
- `sourcecode/components/FileEditToolUpdatedMessage.tsx`: file update result summaries and diff display.
- `sourcecode/Tool.ts`: tool rendering contracts such as `renderToolUseProgressMessage` and `renderGroupedToolUse`.

ADK is not a primary reference for this feature because the missing work is TUI transcript and rendering behavior rather than artifact-service semantics.

## Current Gap Summary

The current `go-cli/tui` implementation only shows one active tool spinner and a permission prompt. It does not keep tool-use entries in the transcript, does not render `tool_progress`, does not display tool results or tool errors inline, does not show structured diffs for file mutations, and does not support grouped tool-use output.

## Implementation Phases

### Phase 1: Event and State Model

Target files:

- `go-cli/tui/src/protocol/types.ts`
- `go-cli/tui/src/hooks/useEvents.ts`
- `go-cli/internal/ipc/protocol.go`
- `go-cli/internal/ipc/router.go`

Work:

- Add explicit typed payloads for `tool_progress`, `tool_result`, and `tool_error` on the TUI side.
- Replace the single `activeTool` field with transcript-safe tool-use state keyed by tool id.
- Preserve queued, in-progress, permission-waiting, completed, and errored tool-use entries until the turn is complete.

Acceptance criteria:

- A tool call can outlive the spinner row and remain visible in the conversation state.
- `tool_progress`, `tool_result`, and `tool_error` are no longer ignored by the TUI state reducer.

### Phase 2: Transcripted Tool-Use Messages

Target files:

- `go-cli/tui/src/components/StreamOutput.tsx`
- `go-cli/tui/src/components/ToolProgress.tsx`
- new tool-use message components under `go-cli/tui/src/components/`

Work:

- Render tool-use rows inline in the transcript instead of only in a floating active-tool area.
- Mirror sourcecode state labels: queued, working, waiting for permission, done, and failed.
- Keep the visual treatment lightweight but structured so it can expand later for per-tool renderers.

Acceptance criteria:

- Users can scroll back and see what tool ran during a turn.
- Permission waiting is shown inline, not only through the modal prompt.

### Phase 3: Tool-Specific Result Rendering

Target files:

- `go-cli/tui/src/components/ToolProgress.tsx`
- new per-tool render helpers/components

Work:

- Introduce tool-aware summaries for bash, file read, file write, file edit, grep, glob, web fetch, and web search.
- Render result summaries and error summaries instead of collapsing everything to raw text.
- Keep a fallback renderer for tools without custom views.

Acceptance criteria:

- Tool rows clearly show what happened after completion.
- Errors are visible as tool errors, not only as generic engine failures.

### Phase 4: File Mutation Diffs

Target files:

- new diff/result components in `go-cli/tui/src/components/`
- any engine-side payload enrichment needed for edit/write results

Work:

- Add structured diff or summarized patch rendering for file edit and file write operations.
- Prefer concise inline summaries first, with expandable or fuller diff rendering if the payload supports it.
- Use sourcecode `FileEditToolDiff.tsx` and `FileEditToolUpdatedMessage.tsx` as the behavioral reference.

Acceptance criteria:

- File mutations show added/removed context, not only a generic completion line.
- The result is understandable without reading raw tool JSON.

### Phase 5: Grouped and Polished Tool Use

Target files:

- transcript rendering components
- tool registry or metadata definitions if grouping hints are needed

Work:

- Add grouped tool-use rendering for tools that naturally batch.
- Reduce visual noise for repeated tool calls in one turn.
- Polish loading indicators and message layout to better match sourcecode’s legibility.

Acceptance criteria:

- Multiple related tool calls can be represented without flooding the transcript.
- The final tool-use UI feels like a coherent conversation primitive rather than a temporary status widget.

## Delivery Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5

## Notes

- Do not add tests for this work.
- Keep using sourcecode as the primary implementation reference before copying any behavior.
- Prefer minimal but extensible TUI data structures so the Go engine does not need repeated protocol churn.
