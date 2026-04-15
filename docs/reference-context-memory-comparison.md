# Reference Context and Memory Comparison

Date: 2026-04-16

## Scope

This report compares how context and memory are handled in the reference tools under `reference/`, excluding `silvery/`, against Chan's current implementation.

Reviewed references:

- `adk-go`
- `claudecode`
- `codex`
- `gemini-cli`
- `opencode`
- `pi-mono`

## Chan Baseline

Chan already has a coherent integrated design for prompt context, durable memory, and context pressure management.

What Chan does today:

- Session-stable context is loaded once through `LoadSystemContext()` and includes git/user/platform metadata plus loaded instruction and memory files: [chan/internal/agent/context_inject.go](../chan/internal/agent/context_inject.go), [chan/internal/agent/memory_files.go](../chan/internal/agent/memory_files.go)
- Per-turn volatile context is refreshed through `LoadTurnContext()` and includes cwd, time, branch, git status, recent log, and directory listing: [chan/internal/agent/context_inject.go](../chan/internal/agent/context_inject.go)
- Prompt assembly combines base prompt, durable memory recall, skills, environment context, live retrieval, and attempt-log context: [chan/internal/agent/query_stream.go](../chan/internal/agent/query_stream.go), [chan/internal/agent/iteration_pipeline.go](../chan/internal/agent/iteration_pipeline.go)
- Durable memory is split between project instructions (`AGENTS.md`, `AGENTS.local.md`) and indexed durable memory (`MEMORY.md`) in user and project config locations: [chan/internal/agent/memory_files.go](../chan/internal/agent/memory_files.go)
- Memory recall is deterministic and lexical, selecting relevant indexed entries from project and user memory indexes without an LLM side selector: [chan/internal/memory/recall.go](../chan/internal/memory/recall.go)
- Context overflow is handled by a tiered compaction pipeline: tool-result truncation, full summarization, then partial recent-window compaction: [chan/internal/compact/pipeline.go](../chan/internal/compact/pipeline.go)

Chan's strongest qualities for this comparison:

- Good separation between session-stable context, turn context, durable memory, and live retrieval.
- Deterministic memory recall makes behavior easier to reason about and cheaper than LLM-routed memory selection.
- Project memory and user memory are already separate concepts.
- Compaction is built into the core loop rather than being left to external tooling.

Chan's main gaps relative to the strongest references:

- No first-class session-memory document comparable to Claude Code's extracted session notes.
- No cache-aware microcompaction layer comparable to Claude Code's more advanced compaction variants.
- Session continuity still depends too heavily on compaction summaries instead of a dedicated extracted working-state layer.

## Summary Ranking

These ratings are relative to Chan's needs as a coding agent, not general product quality.

| Tool | Rating | Confidence | Short take |
| --- | --- | --- | --- |
| Chan | 8.5/10 | High | Strong integrated design with clear durable-memory structure and solid compaction, but still missing first-class session memory and more advanced continuity/compaction features. |
| Claude Code | 9.0/10 | High | Strongest overall context stack; more advanced than Chan, but also much more complex. |
| Gemini CLI | 7.8/10 | High | Strong hierarchical memory and checkpointing; less explicit project/user separation than Chan. |
| Pi-Mono | 7.2/10 | High | Very inspectable memory model with searchable history; less selective and less structured than Chan. |
| ADK-Go | 6.4/10 | High | Clean session and memory abstractions, but compaction and integrated recall are mostly left to the app layer. |
| Codex | 6.0/10 | Low | The vendored code shows strong thread and compaction telemetry, but not enough concrete memory implementation. |
| OpenCode | 5.6/10 | Low | The vendored material exposes session APIs and compaction endpoints, but little actual memory machinery. |

## Chan Rating

Rating: 8.5/10

Why it is not higher:

1. Chan does not yet have first-class session-memory extraction, which is the biggest gap against the strongest reference, Claude Code.
2. Chan still relies on compaction summaries to carry too much working-state continuity across long sessions, instead of maintaining a dedicated extracted session state.
3. The compaction pipeline is solid and practical, but it is not yet as advanced as Claude Code's cache-aware microcompaction and session-memory-assisted continuity.

Why it is not lower:

- Chan already integrates context loading, prompt assembly, durable memory recall, live retrieval, and compaction into one coherent agent loop.
- Chan's split between instructions and indexed durable memory is cleaner than several references that blur those concepts.
- Chan's current deterministic memory recall is a feature, not a flaw, for a coding agent where predictability and inspectability matter.
- The current design is easier to reason about and audit than more feature-heavy systems, which matters for a coding agent.

Honest assessment:

- Chan is already strong enough to be in the top tier of the tools compared here.
- It is clearly ahead of the visible ADK-Go, OpenCode, and vendored Codex implementations for practical integrated memory behavior.
- It is competitive with Gemini CLI and better structured than Pi-Mono for a coding-agent use case.
- Claude Code is still ahead because it solves long-session continuity more completely.

## Per-Tool Analysis

## Claude Code

Key evidence:

- System prompt parts are assembled through `fetchSystemPromptParts()` and consumed by the main query engine: [reference/claudecode/utils/queryContext.ts](../reference/claudecode/utils/queryContext.ts), [reference/claudecode/QueryEngine.ts](../reference/claudecode/QueryEngine.ts)
- Session memory has explicit extraction thresholds and lifecycle state: [reference/claudecode/services/SessionMemory/sessionMemoryUtils.ts](../reference/claudecode/services/SessionMemory/sessionMemoryUtils.ts)
- Session memory uses a structured template with explicit continuity sections and token caps: [reference/claudecode/services/SessionMemory/prompts.ts](../reference/claudecode/services/SessionMemory/prompts.ts)

How it works:

- Claude Code separates system prompt construction into reusable cached pieces: default system prompt, user context, and system context.
- It adds a dedicated session-memory mechanism that periodically extracts durable notes from the active conversation once token thresholds are met.
- It has explicit compaction boundaries and support for snip-based history reduction in addition to compact summaries.

Strengths compared with Chan:

- Best session continuity story in the reference set. Chan has durable memory recall, but Claude Code also maintains an extracted session state document.
- Better compaction sophistication. Chan has a good three-stage compaction pipeline, but Claude Code adds compact boundaries, snip replay, and cache-aware handling.
- More explicit token-governed lifecycle around memory extraction.

Weaknesses compared with Chan:

- Much more operational complexity. There are more moving parts, more feature flags, and more state transitions to reason about.
- More LLM-mediated behavior means more nondeterminism than Chan's deterministic memory recall.
- Harder to audit end to end than Chan's smaller integrated Go implementation.

Rating: 9.0/10

Verdict versus Chan:

- Claude Code is stronger than Chan on advanced context lifecycle management.
- Chan is simpler, easier to reason about, and already cleaner on deterministic durable-memory recall.
- The biggest improvement Chan could borrow is first-class session-memory extraction.

## Gemini CLI

Key evidence:

- Hierarchical GEMINI.md loading and refresh are implemented in `memoryDiscovery.ts`: [reference/gemini-cli/packages/core/src/utils/memoryDiscovery.ts](../reference/gemini-cli/packages/core/src/utils/memoryDiscovery.ts)
- Tests show upward, downward, and global hierarchical context loading: [reference/gemini-cli/packages/core/src/utils/memoryDiscovery.test.ts](../reference/gemini-cli/packages/core/src/utils/memoryDiscovery.test.ts)
- Memory commands expose current memory, reload, and `save_memory`: [reference/gemini-cli/packages/core/src/commands/memory.ts](../reference/gemini-cli/packages/core/src/commands/memory.ts)
- Context compression is stateful and file-aware: [reference/gemini-cli/packages/core/src/context/contextCompressionService.ts](../reference/gemini-cli/packages/core/src/context/contextCompressionService.ts)
- Checkpointing is backed by a shadow git repository: [reference/gemini-cli/packages/core/src/services/gitService.ts](../reference/gemini-cli/packages/core/src/services/gitService.ts)
- Session instructions can inspect full transcript via `client.getHistory()`: [reference/gemini-cli/packages/sdk/src/session.ts](../reference/gemini-cli/packages/sdk/src/session.ts)

How it works:

- Gemini CLI builds memory from hierarchical `GEMINI.md` files across global, project, and subdirectory scopes.
- It supports explicit memory refresh and a `save_memory` tool path.
- It maintains transcript history and also supports context compression plus git-backed checkpointing for restore.

Strengths compared with Chan:

- Better hierarchical discovery of context files than Chan's current user-index and project-index model.
- Strong recovery model because checkpointing is built into the workflow.
- Compression state is persisted and file-aware, which is useful for large code-reading sessions.

Weaknesses compared with Chan:

- Memory is organized around `GEMINI.md` discovery rather than Chan's clearer split between instructions and indexed durable memory.
- Persistent memory semantics are less cleanly separated into project memory versus user preference memory than Chan.
- More stateful compression machinery means more internal surface area and more room for subtle drift.

Rating: 7.8/10

Verdict versus Chan:

- Gemini CLI is stronger on hierarchical context discovery and checkpoint recovery.
- Chan is stronger on explicit durable-memory structure and selective indexed recall.
- A useful idea for Chan is optional hierarchical instruction discovery bounded by trust and project markers.

## Pi-Mono

Key evidence:

- Global and channel-specific MEMORY.md files are loaded directly into prompt context: [reference/pi-mono/packages/mom/src/agent.ts](../reference/pi-mono/packages/mom/src/agent.ts)
- Workspace/channel layout and context model are documented clearly in the Mom README: [reference/pi-mono/packages/mom/README.md](../reference/pi-mono/packages/mom/README.md)
- Slack-side runtime keeps per-message and thread state in channel context: [reference/pi-mono/packages/mom/src/main.ts](../reference/pi-mono/packages/mom/src/main.ts)

How it works:

- Pi-Mono uses plain file-backed memory: one global `MEMORY.md` plus one per-channel `MEMORY.md`.
- It maintains `log.jsonl` as the source of truth and `context.jsonl` as the active model-visible history.
- When context grows too large, older history is compacted while `log.jsonl` remains searchable for effectively unbounded recall.

Strengths compared with Chan:

- Extremely inspectable and easy to debug. The memory model is obvious from the filesystem.
- Good separation between source-of-truth history and model-visible working context.
- Searchable long history is practical and operationally simple.

Weaknesses compared with Chan:

- Memory recall is broad and file-based rather than selectively recalled from an index like Chan.
- The model appears to ingest memory more directly, which risks prompt bloat and stale context.
- It is Slack/channel centric, so its abstractions are less reusable for a general coding CLI.

Rating: 7.2/10

Verdict versus Chan:

- Pi-Mono beats Chan on inspectability and operational simplicity.
- Chan beats Pi-Mono on structured durable memory, selective recall, and cleaner coding-agent focus.
- A worthwhile lesson for Chan is to keep long-history storage and model-visible context visibly distinct.

## ADK-Go

Key evidence:

- Sessions expose immutable-looking event history and state: [reference/adk-go/session/session.go](../reference/adk-go/session/session.go)
- Events carry branch metadata for sub-agent isolation: [reference/adk-go/session/session.go](../reference/adk-go/session/session.go)
- Agent memory is abstracted as `AddSessionToMemory` and `SearchMemory`: [reference/adk-go/agent/agent.go](../reference/adk-go/agent/agent.go), [reference/adk-go/tool/tool.go](../reference/adk-go/tool/tool.go)
- Example wiring shows sessions being added into memory and then searched later: [reference/adk-go/examples/tools/loadmemory/main.go](../reference/adk-go/examples/tools/loadmemory/main.go)

How it works:

- ADK-Go treats session history as a sequence of events with state deltas and optional branch isolation.
- Memory is an external service abstraction, not a built-in prompt-layer feature.
- The framework gives the application places to store and search memory, but it does not prescribe an integrated compaction-and-recall loop.

Strengths compared with Chan:

- Strong framework-level abstraction for sessions, state, events, and branch isolation.
- Clean pluggable memory service design.
- Better multi-agent branch semantics than Chan's current memory model.

Weaknesses compared with Chan:

- Weaker integrated context-management story. Chan already assembles system context, turn context, memory recall, retrieval, and compaction into one loop.
- No first-class compaction pipeline in the visible reference code.
- Memory appears more infrastructure-level than user-visible or workflow-guiding.

Rating: 6.4/10

Verdict versus Chan:

- ADK-Go is a cleaner framework abstraction, but Chan is ahead as a concrete coding-agent product in integrated context and memory behavior.
- Chan should only borrow from ADK-Go if it wants stronger branch-aware event modeling.

## Codex

Confidence note:

- The vendored Codex material here exposes telemetry and protocol shape much more clearly than the actual prompt assembly and memory implementation. The rating below therefore has lower confidence.

Key evidence:

- Thread and turn identity are explicit telemetry primitives: [reference/codex/codex-rs/analytics/src/facts.rs](../reference/codex/codex-rs/analytics/src/facts.rs)
- Initialization modes include new, forked, and resumed threads: [reference/codex/codex-rs/analytics/src/facts.rs](../reference/codex/codex-rs/analytics/src/facts.rs)
- Compaction is modeled explicitly with trigger, reason, implementation, phase, strategy, and token deltas: [reference/codex/codex-rs/analytics/src/facts.rs](../reference/codex/codex-rs/analytics/src/facts.rs)

What can be concluded safely:

- Codex clearly has a thread-first conversation model with turn identity, fork/resume semantics, and explicit compaction instrumentation.
- The reference shows strong operational observability around compaction.
- The actual durable-memory and recall implementation is not clearly exposed in the vendored code used for this comparison.

Strengths compared with Chan:

- Stronger explicit protocol identity for thread and turn management.
- Better visible telemetry around compaction lifecycle and token deltas.
- Native fork/resume model appears central rather than incidental.

Weaknesses compared with Chan:

- I cannot find a concrete memory-recall pipeline here comparable to Chan's indexed project and user memory.
- The vendored evidence is much more about instrumentation than the actual retrieval and memory stack.
- Because the implementation is not visible enough, it is harder to judge the practical prompt-layer behavior.

Rating: 6.0/10

Verdict versus Chan:

- From the code visible here, Chan is ahead on inspectable durable-memory behavior.
- Codex appears strong on thread lifecycle and compaction observability, but the memory story is not concrete enough in this checkout to beat Chan.

## OpenCode

Confidence note:

- The vendored OpenCode material in this repo is mostly API/spec surface, not the full context/memory implementation.

Key evidence:

- The project/session API exposes session creation, compaction, message access, revert/unrevert, and file lookup: [reference/opencode/specs/project.md](../reference/opencode/specs/project.md)

What can be concluded safely:

- OpenCode has a clear session API with explicit compact, message, revert, and file endpoints.
- It appears to support multi-project and multi-worktree session management.
- I do not see a concrete durable-memory mechanism comparable to Chan's user/project memory indexes in the vendored implementation.

Strengths compared with Chan:

- Strong session and project API surface.
- Clear support for session lifecycle operations such as compact and revert.
- Multi-project worktree awareness is explicit in the spec.

Weaknesses compared with Chan:

- No visible durable-memory recall implementation in the checked-in reference.
- No visible prompt-assembly or memory-selection logic strong enough to compare directly with Chan.
- The design visible here is more session-control API than context/memory architecture.

Rating: 5.6/10

Verdict versus Chan:

- Chan is clearly ahead on inspectable context and memory machinery in the material available here.
- OpenCode may have stronger internals elsewhere, but they are not evidenced in this repository snapshot.

## Overall Conclusions

Chan's current position:

- Chan is already in the top tier of the compared set for integrated coding-agent context and memory design.
- The only clearly stronger reference in this area is Claude Code, mainly because of extracted session memory and more advanced compaction mechanics.
- Chan is stronger than ADK-Go, OpenCode, and the visible Codex snapshot on practical integrated memory behavior.
- Chan is competitive with Gemini CLI and Pi-Mono, but with a different philosophy: more deterministic and structured than Pi-Mono, less hierarchical and less checkpoint-oriented than Gemini CLI.

The most valuable ideas for Chan to borrow next:

1. Add first-class session-memory extraction similar to Claude Code, so long tasks survive compaction with less loss.
2. Consider optional hierarchical instruction discovery similar to Gemini CLI, but keep Chan's project/user memory separation.
3. Keep Chan's deterministic indexed recall path as the default, even if a semantic recall path is added later.
4. Improve compaction observability with token-delta and strategy telemetry similar to Codex's compaction event model.

## Recommended Next Steps for Chan

1. Implement a session-memory artifact or notes file maintained automatically after context-growth thresholds.
2. Add compaction telemetry events that record strategy, trigger, token reduction, and failure reasons.
3. Consider a hybrid recall mode: deterministic lexical recall first, optional semantic rerank second.
4. Keep instruction files and durable memory indexes separate; this is one of Chan's clearer design advantages over several references.