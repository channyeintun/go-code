# Chan Enhancement Plan

Date: 2026-04-16

## Goal

Raise Chan's context and memory system by focusing on the two highest-value gaps identified in the comparison work:

1. First-class session-memory extraction
2. More advanced continuity-aware compaction

This plan intentionally does not prioritize semantic or embedding-backed memory recall yet. The current deterministic indexed recall is already a good fit for Chan's coding-agent workflow because it is predictable, inspectable, and cheap.

## Success Criteria

- Long-running sessions preserve active working state across compaction with materially less continuity loss.
- The system can compact more aggressively without forcing the model to reconstruct recent intent from raw transcript alone.
- Compaction behavior becomes more observable and tunable.
- The design remains auditable and mostly deterministic.

## Track 1: Session Memory Extraction

## Objective

Maintain a session-scoped extracted working-state artifact that summarizes the active task, recent decisions, current files, pending work, and known failures.

## Why this matters

- This directly addresses the largest gap versus Claude Code.
- It reduces the amount of continuity Chan has to push through ordinary compaction summaries.
- It gives the model a stable “working memory” layer distinct from durable project/user memory.

## Proposed Design

Introduce a session-memory artifact stored alongside other session data, with a structured markdown schema.

Suggested sections:

- Session title
- Current objective
- Current state
- Important files
- Decisions
- Open issues
- Recent errors and corrections
- Next steps

Core behavior:

- Initialize the artifact once a session crosses a configurable context or turn threshold.
- Update it incrementally after significant turns, not every turn.
- Treat it as session-scoped, not durable cross-session memory.
- Inject it into prompt assembly ahead of general environment context when present.
- Keep it under a strict token budget.

## Implementation Steps

### Phase 1: Artifact definition

- Define a dedicated session-memory artifact slot in the artifacts layer.
- Add a markdown template and a small schema contract for required sections.
- Decide storage location and versioning behavior.

### Phase 2: Extraction trigger policy

- Add thresholds based on one or more of:
  - token pressure
  - turn count
  - tool-call count
  - manual compact invocation
- Prevent extraction on very short or low-value sessions.

### Phase 3: Extractor pipeline

- Add a session-memory summarizer that consumes recent messages and the prior session-memory artifact.
- Prefer incremental updates over full rewrites.
- Preserve the most critical sections such as current state and next steps.

### Phase 4: Prompt integration

- Inject session memory as its own prompt section.
- Order it after base instructions but before broad environment details.
- Ensure it is clearly marked as session continuity, not durable user/project memory.

### Phase 5: Guardrails

- Add section and total token caps.
- Add fallback behavior when extraction fails.
- Add protection against duplicating information already present in durable memory or live transcript.

## Acceptance Criteria

- After compaction, Chan can continue multi-step work with fewer lost pending tasks and fewer repeated reads.
- Session-memory content stays concise and does not drift into a changelog dump.
- Failure to update session memory never blocks the main loop.

## Track 2: Advanced Continuity-Aware Compaction

## Objective

Improve compaction so it preserves recent actionable state more intelligently and reduces prompt bloat before full summarization is needed.

## Why this matters

- Chan's current compaction pipeline is good, but still coarse compared with the strongest reference.
- Better compaction reduces latency, token pressure, and continuity loss.
- Session memory and compaction should reinforce each other: session memory holds ongoing working state, compaction reduces transcript weight.

## Proposed Design

Extend the current compaction pipeline with two additions:

1. A pre-summary microcompaction layer
2. Better observability and continuity-aware compaction decisions

## Implementation Steps

### Phase 1: Microcompaction layer

Before full summarization:

- aggressively trim oversized tool outputs
- collapse repeated or low-signal result payloads
- preserve references to touched files, failures, and conclusions
- retain recent user turns and current assistant trajectory in full

Potential outputs:

- shortened tool result bodies
- normalized placeholders for repetitive output
- retained metadata for files, errors, and commands

### Phase 2: Continuity-aware compaction heuristics

Make compaction decisions based on more than token count.

Signals to consider:

- unresolved current objective
- pending tool/action chain
- recent failure/retry loop
- high-value file reads in the active window
- existence and freshness of session-memory artifact

This should answer: “what must remain verbatim because the model is still actively working with it?”

### Phase 3: Session-memory-assisted compaction

- When session memory is fresh, allow older transcript slices to compact more aggressively.
- When session memory is stale or missing, compact more conservatively.
- Prefer partial-window compaction before full-history summarization.

### Phase 4: Compaction telemetry

Add explicit telemetry for:

- trigger
- strategy
- token count before and after
- whether session memory was available
- whether microcompaction ran
- failure reason when compaction aborts or is skipped

## Acceptance Criteria

- Token reduction improves before full summarization is needed.
- Continuity regressions decrease on long tool-heavy tasks.
- Compaction decisions are explainable from telemetry.
- Partial compaction remains the default path when enough recent state can be preserved.

## Suggested Rollout Order

1. Add compaction telemetry first.
2. Implement session-memory artifact and manual inspection path.
3. Enable session-memory extraction behind a feature flag.
4. Add microcompaction behind a feature flag.
5. Tune continuity-aware heuristics using real session traces.
6. Promote both features to default once regression risk is understood.

## Risks

- Session memory can become stale or verbose if update policy is poor.
- Microcompaction can accidentally remove details the model still needs.
- Too many heuristics can make compaction behavior hard to reason about.

## Risk Mitigations

- Keep session memory structured and budgeted.
- Preserve recent turns verbatim.
- Emit detailed compaction telemetry.
- Roll out behind flags first.

## What Not To Do Yet

- Do not add embeddings or semantic reranking as part of this enhancement pass.
- Do not merge durable project/user memory with session memory.
- Do not turn session memory into a permanent cross-session store.

## Recommended First Deliverable

Build the smallest useful slice in this order:

1. Compaction telemetry events
2. Session-memory artifact template and storage
3. Manual or threshold-triggered session-memory updates
4. Prompt injection of session memory
5. Microcompaction for oversized tool outputs

That sequence gives Chan measurable wins early without forcing a full redesign.