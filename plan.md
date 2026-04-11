# Explanation-Driven Enhancement Plan

## Goal

Replace the closed parity-era roadmap with a new roadmap driven by the architecture patterns in `sourcecode-explanation/` and confirmed with targeted reads from `sourcecode/`. Improve only the areas that materially raise `gocode` quality for local coding work:

- subagents, but not swarm/team orchestration
- tool depth and concurrent execution
- project memory
- compaction and prompt-budget behavior
- TUI/UI
- milliseconds-level developer experience

## Reference Basis

Primary reference:

- `sourcecode-explanation/book/ch05-agent-loop.md`
- `sourcecode-explanation/book/ch06-tools.md`
- `sourcecode-explanation/book/ch07-concurrency.md`
- `sourcecode-explanation/book/ch08-sub-agents.md`
- `sourcecode-explanation/book/ch11-memory.md`
- `sourcecode-explanation/book/ch13-terminal-ui.md`
- `sourcecode-explanation/book/ch17-performance.md`

Targeted source cross-checks:

- `sourcecode/Tool.ts`
- `sourcecode/tools.ts`
- `sourcecode/query.ts`
- `sourcecode/tasks.ts`
- `sourcecode/main.tsx`

Current implementation seams reviewed for planning:

- `gocode/internal/agent/loop.go`
- `gocode/internal/agent/memory_files.go`
- `gocode/internal/agent/token_budget.go`
- `gocode/internal/tools/interface.go`
- `gocode/internal/tools/registry.go`
- `gocode/internal/tools/orchestration.go`
- `gocode/internal/tools/streaming_executor.go`
- `gocode/internal/compact/pipeline.go`
- `gocode/internal/session/store.go`
- `gocode/tui/src/components/ArtifactView.tsx`
- `gocode/tui/src/components/Input.tsx`
- `gocode/tui/src/hooks/useEvents.ts`

## Non-Negotiable Guardrails

- Keep artifacts first-class. No roadmap item may demote implementation plans, task lists, walkthroughs, diff previews, search reports, or tool-log artifacts into transcript-only features.
- Do not add MCP, swarm/team orchestration, remote execution, browser automation, or other product lines that do not belong to the current `gocode` scope.
- Prefer extending the existing local engine and TUI architecture over introducing parallel subsystems.
- Keep subagents local-first and artifact-safe. In the first version, child agents return reports to the parent rather than mutating parent session artifacts directly.
- This roadmap is for planning and sequencing only. It does not authorize implementation shortcuts around permissions, budgeting, or artifact review.

## Current Baseline

- `gocode` already has strong artifact groundwork: reviewable implementation plans, task-list and walkthrough artifacts, routed diff and search artifacts, and artifact-aware TUI panels.
- Tool execution is no longer naive: the engine already supports per-call concurrency classification, batch execution, and a streaming executor that preserves ordered result delivery.
- Compaction exists and works: tool-result truncation, full summarization, and partial recent-window compaction are already implemented.
- The largest gaps are now architectural rather than cosmetic: there is no subagent runtime, no persistent memory and recall system, no cache-aware prompt budgeting, limited tool breadth compared with the reference architecture, and no serious latency instrumentation.

## Phase 1: Measure and Protect the Runtime

**Purpose:** establish hard data and guardrails before adding new agent depth.

### Scope

- Add startup, model, tool, compaction, and TUI timing checkpoints inspired by `sourcecode/main.tsx` and `sourcecode/query.ts`.
- Define an artifact ownership contract for tool outputs, future subagents, and compaction or memory outputs.
- Add per-turn aggregate tool-result budgeting so wider concurrency and future subagents cannot flood the transcript or bypass artifact spill logic.
- Track the latencies that matter to developer perception: boot to ready, prompt submit to first token, prompt submit to first tool result, prompt submit to artifact focus, and manual compaction duration.

### Exit Criteria

- Every later phase can be evaluated against real latency numbers instead of guesses.
- Artifact spill and focus behavior remain stable under heavier concurrent tool load.
- The repo has a single source of truth for runtime guardrails before subagents or memory are introduced.

## Phase 2: Deepen the Local Tool System

**Purpose:** close the biggest execution gap first without importing unrelated feature sets.

### Scope

- Extend the `Tool` contract with semantic validation so tools can reject invalid or low-value calls before permission resolution and execution.
- Make concurrency classification richer for `bash` and other complex tools by inspecting input shape, not only tool identity.
- Expand the local tool surface in focused categories only:
  - code reading and code navigation
  - structured repository inspection
  - safer multi-file editing and batching
  - terminal and process follow-up that complements the existing PTY background command flow
- Keep ordered result delivery, permission gates, tool-result budgeting, and artifact spill paths as non-negotiable invariants.

### Notes

- Do not chase a raw `40+ tools` number just for parity optics.
- The first target is a coherent local toolset that materially improves coding workflows without dead weight.
- If the local tool surface grows large enough, deferred schema loading becomes worth planning; it is not the first step.

### Exit Criteria

- The tool surface is materially broader than the current local-only set.
- Tool validation and concurrency decisions are input-aware where it matters.
- Larger tool batches do not regress artifact routing or transcript clarity.

## Phase 3: Introduce Artifact-Safe Subagents

**Purpose:** add delegation without importing swarm, remote, or team complexity.

### Scope

- Add a single `Agent` tool for bounded delegation with a parent-child lifecycle modeled after the explanation and source code.
- Start with two agent types only:
  - `general-purpose`
  - `explore`
- Support both blocking and background execution.
- Give child agents scoped tool pools, isolated permission modes, and independent cancellation semantics.
- Return a child report, transcript summary, or background handle to the parent. In v1, child agents do not directly update the parent session's task-list or implementation-plan artifacts.

### Notes

- No team agents.
- No swarm messaging.
- No remote or worktree execution in the initial scope.
- The first implementation should prove delegation quality and transcript clarity before adding more agent types.

### Exit Criteria

- The model can delegate research, search, and setup work without polluting the parent turn.
- Background children never deadlock on permission prompts.
- Artifact ownership remains explicit and stable.

## Phase 4: Build a Real Project Memory System

**Purpose:** move from instruction-file loading to durable, selective project memory.

### Scope

- Add project-scoped memory storage outside the artifact store, following the four-type taxonomy from the explanation:
  - `user`
  - `feedback`
  - `project`
  - `reference`
- Always load a lightweight `MEMORY.md` index and keep full memory files on demand.
- Add an async memory recall side-query so only the most relevant memories enter the next turn.
- Add staleness warnings for older memories so the model treats them as observations to verify, not immutable facts.
- Reuse existing file tools for the write path instead of inventing a separate memory tool surface.

### Notes

- `AGENTS.md` and `AGENTS.local.md` remain instruction files, not project memory.
- Memory must stay separate from artifacts so long-term observations do not pollute session deliverables.

### Exit Criteria

- `gocode` can remember durable project guidance across sessions.
- Memory recall stays selective and bounded.
- Old memories surface with age-aware caveats instead of false authority.

## Phase 5: Upgrade Compaction and Prompt Budgeting

**Purpose:** reclaim context and cost headroom without weakening current compaction behavior.

### Scope

- Keep the existing three-stage compaction pipeline and add tighter output slot reservation with escalation only on truncation.
- Reorder prompt construction for cache stability: stable sections first, volatile sections later.
- Add section-level memoization for system prompt assembly.
- Make compaction, tool-result budgeting, and future memory recall cooperate rather than each managing context pressure in isolation.
- Use the existing `compact-summary` artifact kind only if it improves reviewability; do not duplicate transcript content by default.

### Exit Criteria

- Sessions keep more usable context before compaction fires.
- Repeated turns avoid unnecessary prompt rebuild churn.
- Compaction remains explainable, bounded, and compatible with future subagents and memory recall.

## Phase 6: Tighten the TUI and Milliseconds-Level Developer Experience

**Purpose:** turn the runtime and interface improvements into felt speed.

### Scope

- Use Phase 1 timing data to prioritize:
  - startup fast paths
  - API preconnect and warmup
  - transcript rendering hot spots
  - prompt editor interaction polish
  - search and index performance for large repositories
  - new UI surfaces for subagent activity and memory usage
- Keep artifact surfaces primary when presenting structured work.
- Prefer measured Ink improvements over speculative renderer rewrites.

### Candidate UI Improvements

- clearer subagent status surfaces
- memory recall visibility without transcript noise
- faster transcript paging and search on long sessions
- richer prompt editing and keybinding ergonomics
- more actionable latency and status feedback in the footer and status line

### Exit Criteria

- The slowest visible interactions are instrumented and intentionally improved.
- UI work stays anchored to measured bottlenecks instead of imitation.
- Artifact presentation remains stronger, not weaker, after the new surfaces land.

## Recommended Execution Order

1. Phase 1: runtime measurement and guardrails
2. Phase 2: tool depth and concurrency
3. Phase 3: subagents
4. Phase 4: memory
5. Phase 5: compaction and prompt budgeting
6. Phase 6: TUI and milliseconds-level developer experience

This order is deliberate. Better measurement and stronger tool execution reduce risk for every later phase. Subagents become substantially more valuable once the tool system is deeper. Memory becomes more useful once parent and child agents can both consume it. UI work should reflect measured bottlenecks from the earlier phases, not guesswork.

## Success Signals

- Tool batches finish faster without reducing determinism.
- The first subagent release improves search and research turns without confusing artifact ownership.
- Memory recall changes behavior across sessions in ways the user can notice and trust.
- Compaction fires later and with less disruption.
- Boot-to-ready and first-response latency are tracked and improved as first-class engineering metrics.
