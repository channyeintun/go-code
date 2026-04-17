# Read Tool Top-Score Plan

## Summary

Make chan's `read_file` best-in-class for token budget on both first reads and repeated reads. That requires the full package, not just API cleanup: one canonical request shape, bounded default windows, hard payload caps, short continuation hints, stronger model guidance, per-session reread de-duplication, and cache invalidation after file writes. Per request, this plan excludes test work.

## What “Top” Means Here

- Match or beat opencode on first-read efficiency.
- Match Claude Code on unchanged reread efficiency during long sessions.
- Keep model behavior stable by teaching one request shape and one continuation shape.
- Avoid whole-file dumps unless the model intentionally pages through the file.

## Scope

- In scope: range API simplification, removal of legacy line-range params, default bounded reads, hard output caps, long-line clipping, canonical continuation hints, read-result metadata cleanup, session-scoped reread state, write-triggered cache invalidation, prompt guidance, and lightweight read telemetry.
- Out of scope: test additions or updates, image/PDF support changes, directory reading support, and cross-session persistence of read state.

## Recommended Defaults

- `filePath` is required.
- `offset` is an optional 1-based starting line. Default: `1`.
- `limit` is an optional line count. Default: `2000`. Hard max: `2000`.
- `maxReadOutputBytes = 50 * 1024`
- `maxRenderedLineChars = 2000`
- Returned output keeps 1-based line numbers.

These defaults are the minimum needed to have a credible “top score” claim. Without an explicit line cap, byte cap, and unchanged-reread suppression, chan will still lose budget in realistic long sessions.

## Files Expected To Change

- `chan/internal/tools/file_read.go`
- `chan/internal/tools/file_read_state.go` as a new session-scoped read-state tracker
- `chan/internal/tools/compat_aliases.go`
- `chan/internal/engine/tool_executor.go`
- `chan/internal/engine/engine.go`
- `chan/internal/tools/interface.go` only if extra metadata fields or comments need clarification
- File-mutating tools that can change on-disk contents, so successful writes invalidate read-state entries for the affected path

## Planned Changes

### 1. Expose One Public Read Contract

- Make `filePath`, `offset`, and `limit` the only documented `read_file` parameters.
- Define `offset` as a 1-based starting line so it matches the line numbers rendered in output.
- Remove `startLine`, `endLine`, `start_line`, and `end_line` from the tool schema and implementation.
- Remove line-range normalization for `read_file` from `chan/internal/engine/tool_executor.go`.
- Reject legacy or mixed range parameters with a clear validation error instead of silently translating them.

### 2. Stop Unbounded Whole-File Reads

- Change the no-range behavior so `read_file` returns the first bounded window instead of the whole file.
- Treat missing `offset` and `limit` as `offset=1` and `limit=2000`.
- Keep explicit `offset` and `limit` authoritative, but clamp `limit` to the hard maximum.
- Set `ToolOutput.Truncated = true` whenever readable content remains after the returned slice.

### 3. Add Hard Payload Controls Inside The Tool

- Enforce the byte cap before tool output leaves `chan/internal/tools/file_read.go`.
- Stop on full-line boundaries where practical so the result stays readable.
- Clip unusually long lines to `maxRenderedLineChars` so one line cannot consume the budget.
- Avoid any trailing prose other than the canonical continuation hint.

### 4. Standardize Continuation Behavior

- Always emit the same short suffix for partial reads:
  - `[Partial read. Continue with offset=<next> limit=<same>.]`
- Keep the continuation format stable so the model can chain reads without inventing a new pattern.
- Base `<next>` on the next unread 1-based line.

### 5. Add Per-Session Reread De-Duplication

- Add a new read-state tracker in `chan/internal/tools/file_read_state.go`, modeled after the existing session-scoped file-history installation pattern.
- Key entries by normalized absolute path, normalized `offset`, normalized `limit`, file size, and file modification time.
- Install the active read-state tracker during engine startup in `chan/internal/engine/engine.go`, similar to how file history is installed today.
- Before reading file contents, stat the file and check whether the exact same slice was already returned in the current session and the file is unchanged.
- If the file and slice are unchanged, return a short unchanged-file stub instead of replaying the file contents into context.

### 6. Invalidate Read State On Writes

- Invalidate cached read-state entries for a path whenever any successful file-mutating tool changes that path.
- This invalidation must happen in every write/edit path that can affect file contents, including patch-based edits.
- Do not rely only on `mtime` checks; explicit invalidation keeps reread suppression correct even when multiple mutations happen quickly inside one session.

### 7. Improve Read Result Metadata

- Set `ToolOutput.FilePath` for successful reads.
- Populate `ToolOutput.Preview` with a short preview of the returned slice or unchanged stub.
- Keep the main `Output` compact enough that chan's later compaction pass can summarize old reads cleanly.

### 8. Strengthen Model-Facing Read Guidance

- Update `FileReadTool.Description()` in `chan/internal/tools/file_read.go` to explicitly push the model toward:
  - using `grep_search` first for overview or anchor discovery,
  - reading larger windows instead of many tiny slices,
  - using only `filePath`, `offset`, and `limit`,
  - continuing with the canonical continuation hint when truncated,
  - not rereading the same unchanged slice.
- Update the main system prompt in `chan/internal/engine/engine.go` with one concise read-tool policy block so the model gets the same guidance before the first call.

### 9. Add Lightweight Read Telemetry For Tuning

- Record per-call read stats needed to tune defaults after rollout:
  - requested `offset`
  - requested `limit`
  - lines returned
  - bytes returned
  - truncated vs non-truncated
  - unchanged-reread de-dup hits
  - legacy-param rejection count
- Keep this lightweight and session-scoped. The goal is to tune caps and prompt wording, not build a separate analytics subsystem.

## Implementation Order

1. Narrow the public API to `filePath`, `offset`, and `limit`.
2. Add default windowing, hard output caps, and canonical continuation hints.
3. Add session-scoped reread state and unchanged-file stubs.
4. Invalidate read-state entries in every successful write/edit path.
5. Tighten the tool description, system prompt guidance, and read telemetry.

## Acceptance Criteria

- A `read_file` call with only `filePath` returns a bounded initial window, not the whole file.
- No single `read_file` result exceeds the configured byte cap.
- Very long individual lines are clipped instead of dominating the payload.
- Truncated reads always include the canonical `offset` and `limit` continuation hint.
- Calls using legacy line-range parameters fail fast with a clear error telling the caller to use `offset` and `limit`.
- Repeating the same unchanged file slice in one session returns a short unchanged-file stub instead of replaying file contents.
- Successful writes invalidate cached read-state entries for the affected path.
- Model-facing guidance clearly tells the model to search first when appropriate, page with `offset` and `limit`, and avoid unchanged rereads.

## Bottom Line

This is the full patch scope required for chan to have a credible claim to the top read-tool budget profile. If any of the following stay out of scope, chan will still leave budget on the table relative to the references:

- bounded default reads
- hard output caps
- unchanged-reread de-duplication
- write-triggered cache invalidation
- strong model guidance
