# Progress

## Working Rules

- Follow `plan.md` as the active execution baseline.
- Use `sourcecode-explanation/` as the primary reference and targeted `sourcecode/` reads to confirm architecture decisions.
- Do not add tests.
- Do not plan MCP, swarm or team orchestration, remote execution, or unrelated product lines.
- Preserve first-class artifacts across every future phase.
- After each completed task: update this file, run formatting, and create a git commit.

## Current Status

| Workstream                          | Status    | Notes                                                                                      |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| Planning refresh                    | completed | 2026-04-12 explanation-driven roadmap replaced stale parity-era planning docs.             |
| Phase 1 runtime measurement         | planned   | Required before subagents or large UI work.                                                |
| Phase 2 tool depth                  | planned   | Extend the local tool system and input-aware concurrency without broadening product scope. |
| Phase 3 subagents                   | planned   | Parent-child only, with no swarm, team, or remote scope.                                   |
| Phase 4 memory                      | planned   | Project-scoped memory layer kept separate from artifacts.                                  |
| Phase 5 compaction and cache        | planned   | Keep the current pipeline and improve context budgeting plus cache stability.              |
| Phase 6 UI and developer experience | planned   | Prioritize only measured bottlenecks and artifact-safe surfaces.                           |

## Task Log

### 2026-04-12

- Completed: reviewed `sourcecode-explanation` chapters 5, 6, 7, 8, 11, 13, and 17 as the primary design reference for the next roadmap.
- Completed: cross-checked targeted slices in `sourcecode/Tool.ts`, `sourcecode/tools.ts`, `sourcecode/query.ts`, `sourcecode/tasks.ts`, and `sourcecode/main.tsx` to confirm the reference architecture patterns.
- Completed: audited the current `gocode` seams in the agent loop, tool system, compaction pipeline, session storage, and TUI so the new roadmap reflects the actual codebase rather than the previous backlog.
- Updated: replaced the stale artifact-only and parity-era planning docs with a new roadmap centered on subagents, tools and concurrency, memory, compaction and cache behavior, UI, and milliseconds-level developer experience.
- Note: this was a planning-only task. No implementation work was performed.

## Next Planning Baseline

1. Phase 1 must land before any large subagent or UI initiative so latency and artifact safety are measurable.
2. Phase 2 should deepen the local tool system before delegation expands, otherwise subagents will inherit a shallow tool surface.
3. Phase 3 subagents must start with parent-child delegation only; team, swarm, and remote remain out of scope.
4. Phase 4 memory must stay separate from both artifacts and `AGENTS` instruction files.
5. Phase 5 and Phase 6 should be driven by measured context and latency data, not parity optics.
