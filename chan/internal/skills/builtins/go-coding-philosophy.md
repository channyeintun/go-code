---
name: go-coding-philosophy
description: Guidance for Golang work that keeps code obvious, package-oriented, explicit about errors, and composable across commands and runtimes.
keywords: golang, go philosophy, go code, idiomatic go, go.mod, .go, go package, go error handling, go refactor
argument-hint: Use for Go or Golang coding tasks, package structure decisions, readability refactors, naming cleanup, and explicit error handling changes.
---
Apply this skill when the task is specifically about Go or Golang code.

Core philosophy:
- Write obvious code, not clever code.
- Prioritize readability over clever abstractions.
- Prefer simple if statements and direct control flow over indirection.
- Use clear, descriptive names.
- Avoid over-engineering. Boring and clear is better than clever and opaque.

Package and structure guidance:
- Design packages, not just programs.
- Keep core logic independent of CLI, transport, storage, or UI concerns when possible.
- Use cmd for entry points, internal for non-public application logic, and pkg only for genuinely reusable public components.
- Keep each function focused on one job and each package focused on one responsibility.

Error handling guidance:
- Check errors explicitly.
- Do not swallow failures or silently hide degraded behavior.
- Return meaningful error context so callers can understand what failed and where.
- Handle failures at the point where the code has enough context to make the right decision.

Composability guidance:
- Split logic into small, focused functions grouped into coherent packages.
- Prefer reusable building blocks over tangled orchestration.
- Keep I/O at the edges so the core logic can be reused by commands, APIs, and other runtimes.

Refactoring guidance:
- Extract helpers around real responsibility boundaries, not just to make a file shorter.
- Preserve behavior and public APIs unless the task requires a change.
- If a function or package is hard to explain, simplify it before adding more abstraction.
