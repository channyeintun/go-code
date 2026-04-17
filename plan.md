# Chan UX Improvement Plan

## Objective

Improve `chan` so a new user can run `chan` or `chan .` and get a usable session without needing to understand provider internals first.

The target experience is:

- If the user already has a usable provider, `chan` opens directly into a working session.
- If the default provider is unavailable, `chan` stays alive and explains what to do next.
- Provider and model switching are guided, visible, and recoverable.
- Missing credentials never crash startup.

## Baseline

Recent fixes already landed:

- Startup no longer crashes when `openai/gpt-5.4` is selected without an OpenAI API key.
- The shipped default model now matches a working provider path: `github-copilot/gpt-5.4`.

This plan focuses on the next layer: making multi-provider behavior understandable and low-friction.

## UX Principles

1. The default path must work or fail gracefully.
2. Provider availability should be discovered, not guessed by the user.
3. Errors must tell the user exactly what action to take next.
4. Model selection should expose provider state, not just model names.
5. The UI should distinguish between available, connected, configured, and unavailable providers.
6. Recent successful choices should be remembered when still valid.

## Current Gaps

1. Startup picks one default provider/model, but there is no explicit provider discovery layer visible to the user.
2. The model picker is model-centric and does not clearly surface provider health, auth source, or setup state.
3. `/connect` is still modeled too closely around GitHub Copilot and needs to become a true provider onboarding system.
4. `/status` does not explain why a provider is available, unavailable, or chosen as the active default.
5. There is no visible recent-model preference flow similar to `opencode`'s recent selection behavior.
6. Recoverable provider/model startup issues are handled more safely now, but the user experience is still reactive rather than guided.

## Reference Takeaways From Opencode

The most relevant patterns from `reference/opencode` are:

1. Return provider metadata as a first-class object: source, connection state, default model, and connected status.
2. Pick defaults using precedence: explicit config, recent choice, then first usable provider/model.
3. Show guided provider login/setup with provider-specific instructions.
4. Turn model/provider mistakes into suggestion-based errors instead of generic failures.
5. Make the UI aware of `all providers` vs `connected providers`.

More specifically, `opencode` treats provider onboarding as a generic auth system rather than a single-provider command. Each provider can expose one or more auth methods, usually `oauth` or `api`, and may define follow-up prompts for extra values before completing setup.

The user-facing pattern is:

1. choose provider
2. choose auth method if needed
3. complete the provider-specific flow
4. return directly to model selection or the active session

That is the right shape for `chan` as well.

## Proper `/connect` Design

`/connect` should become the general provider onboarding entry point, not a GitHub-Copilot-only special command.

Recommended command behavior:

- `/connect` opens a provider picker
- `/connect <provider>` jumps directly to one provider
- `/connect status` shows configured providers and auth source
- `/connect help` explains supported providers and auth methods

Recommended internal shape:

- a provider auth registry returns auth methods per provider
- each method has a `type`, `label`, and optional follow-up prompts
- supported method types should start with `device`, `oauth`, and `api_key`
- a completed auth flow stores credentials in a provider-specific persisted form
- after success, the user is taken directly to model selection or back to the session with a success notice

This mirrors the `opencode` pattern: one onboarding entry point, multiple provider-defined auth methods.

## Provider Onboarding Flows

### GitHub Copilot

GitHub Copilot should remain the best-first default path, but it should now live inside the generic `/connect` system.

Recommended user flow:

1. User runs `/connect`.
2. User selects `github-copilot`.
3. `chan` starts the existing device flow.
4. `chan` opens the browser or shows the device URL and code.
5. `chan` waits for completion and stores refreshed Copilot credentials.
6. `chan` enables Copilot model policy where relevant.
7. `chan` offers to switch immediately to `github-copilot/gpt-5.4` if not already active.
8. `chan` opens the model picker or returns to the session with a success notice.

This is also how the user experience works conceptually in `opencode`: start from provider login, complete the provider-specific flow, and then continue directly into model selection.

### API Key Providers

Providers such as OpenAI, Anthropic, Gemini, DeepSeek, Mistral, Groq, Qwen, and GLM should use the same `/connect` entry point, but with an API key method instead of device/OAuth.

Recommended user flow:

1. User runs `/connect openai` or selects `openai` from `/connect`.
2. `chan` explains the supported setup methods in priority order.
3. `chan` offers either:
	- `Use environment variable guidance`
	- `Store API key in chan config/auth store`
4. If the user chooses direct entry, `chan` prompts for the API key and any required provider metadata.
5. `chan` validates the provider with a lightweight preflight.
6. `chan` marks the provider as connected and offers model selection.

The important UX point is that env-key providers should still feel like part of `/connect`, even though the auth mechanism is not OAuth.

### Providers With Extra Prompts

Some providers need more than just a key, for example region, resource name, base URL, or account identifier.

`chan` should support provider-defined prompts so `/connect` can gather these values interactively instead of pushing the user straight into manual config editing.

## Proposed Workstreams

### 1. Add Provider Discovery And Status Snapshot

Introduce a provider discovery layer that evaluates configured and built-in providers before the main session becomes interactive.

Each provider record should include:

- provider id
- display label
- default model
- auth source: env, config, stored auth, or none
- connected/usable boolean
- setup hint
- last initialization error, if any

Primary implementation areas:

- `chan/internal/api/provider_config.go`
- `chan/internal/engine/provider_behavior.go`
- `chan/internal/engine/engine.go`
- `chan/internal/config/config.go`

Deliverable:

- a single provider status snapshot that can be reused by startup, `/status`, `/providers`, and the model picker

### 2. Make Startup Provider-Aware

Change startup to choose the first usable path instead of assuming one static default is always valid.

Recommended precedence:

1. CLI flag
2. environment override
3. last successful model selection
4. saved config model
5. provider default for the highest-priority connected provider
6. first usable provider/model discovered at runtime

Behavior rules:

- If the preferred model is unavailable but another provider is usable, fall back and emit a notice.
- If no provider is usable, stay alive and show setup guidance instead of only surfacing an error line.
- If the chosen provider is unusable for auth reasons, explain the exact next step.

Primary implementation areas:

- `chan/internal/engine/engine.go`
- `chan/internal/engine/provider_behavior.go`
- `chan/tui/src/App.tsx`
- `chan/tui/src/hooks/useEvents.ts`

### 3. Expand Provider Onboarding Beyond GitHub Copilot

Keep GitHub Copilot as the best-first path, but rework `/connect` into a provider auth framework instead of a single-provider special case.

Recommended commands:

- `/connect`
- `/connect github-copilot`
- `/connect openai`
- `/connect anthropic`
- `/connect gemini`
- `/connect status`
- `/providers`

Design rules:

- `/connect` always starts with provider selection unless a provider id is passed explicitly
- each provider can expose one or more auth methods
- auth methods should be described in data, not hardcoded only in command branching
- success should lead directly into provider-aware model selection
- failure should keep the user in a recoverable setup flow

For env-based providers, do not pretend there is a full OAuth flow. Instead, show:

- required environment variables
- optional base URL variable if supported
- exactly where the value will be read from
- how to verify the provider becomes available after setup

For device/OAuth providers, show:

- the provider-specific login method name
- the browser or device-code step clearly
- a waiting state and retry/cancel affordance
- the resulting active/default model after completion

Primary implementation areas:

- `chan/internal/engine/slash_command_handlers.go`
- `chan/internal/config/config.go`
- `chan/internal/api/provider_config.go`
- `chan/internal/engine/provider_behavior.go`
- `chan/tui/src/protocol/types.ts`
- `chan/tui/src/App.tsx`
- `chan/tui/src/components/ModelSelectionPrompt.tsx`
- `chan/internal/commands/`

Deliverables:

- provider auth method registry
- provider picker for `/connect`
- device/OAuth flow for GitHub Copilot under the generic connect system
- API key entry flow for env-key providers
- provider-specific follow-up prompts where needed

### 4. Redesign The Model Picker Around Providers

The current picker works, but it is still a flat list of models. The next step is to make provider state visible.

Recommended picker structure:

- current provider and model at top
- connected providers section
- available but not configured providers section
- custom model entry
- optional show-all toggle

Each row should be able to show:

- provider label
- model label
- current/default badge
- connected or needs setup badge
- short setup hint when unavailable

Primary implementation areas:

- `chan/tui/src/components/ModelSelectionPrompt.tsx`
- `chan/tui/src/App.tsx`
- `chan/tui/src/protocol/types.ts`
- `chan/internal/engine/slash_command_handlers.go`

### 5. Add Provider Status Commands And Surfaces

Add a dedicated provider status view so users do not need to infer state from startup failures.

Recommended user-facing surfaces:

- `/providers` for a concise provider list
- richer `/status` output with provider source and usability
- TUI status surface showing active provider, source, and setup state

Recommended output per provider:

- provider id
- default model
- connected/usability state
- source of credential/config
- next action if unavailable

Primary implementation areas:

- `chan/internal/engine/slash_command_handlers.go`
- `chan/internal/commands/catalog.go`
- `chan/tui/src/components/StatusBar.tsx`
- `chan/tui/src/components/PromptFooter.tsx`

### 6. Persist Recent Successful Model Selections

Persist the last successful provider/model choice separately from long-term config so the UI can prefer what actually worked most recently.

Requirements:

- only store successful selections
- ignore stale selections that no longer resolve to a usable provider/model
- never let stale recent state crash or block startup

Primary implementation areas:

- `chan/internal/config/`
- `chan/internal/engine/slash_command_handlers.go`
- `chan/internal/engine/engine.go`

### 7. Standardize Provider Errors

Provider-related errors should be explicit and actionable.

Target message style:

- what failed
- which provider/model was involved
- whether the session is still usable
- exact next action

Examples:

- `OpenAI is not configured. Set OPENAI_API_KEY or switch to /model default.`
- `Model openai/gpt-5.4 is unavailable. Try github-copilot/gpt-5.4 or run /providers.`
- `GitHub Copilot is not connected. Run /connect github-copilot.`

Primary implementation areas:

- `chan/internal/api/`
- `chan/internal/engine/engine.go`
- `chan/internal/engine/slash_command_handlers.go`

## Delivery Phases

### Phase 1: Safe Startup And Visibility

- provider discovery snapshot
- startup fallback to usable provider/model
- `/providers` command
- richer recoverable startup notices

Success criteria:

- `chan` never exits early because the default provider is missing credentials
- `chan` tells the user which provider it chose and why
- `chan` tells the user what to do when no provider is usable

### Phase 2: Better Selection UX

- provider-aware model picker
- connected vs setup-required grouping
- provider/setup hints in selection UI

Success criteria:

- a user can understand provider availability from the picker alone
- model switching does not feel like blind trial and error

### Phase 3: Better Onboarding

- generalized `/connect` behavior with provider-specific auth methods
- provider-specific setup copy for env-based providers
- provider state integrated into `/status`
- post-connect transition into model selection

Success criteria:

- a new user can recover from missing auth without leaving the product confused
- GitHub Copilot remains the best-first path, but other providers are not second-class
- `/connect` works as one consistent entry point for both Copilot and API-key providers

### Phase 4: Preference Memory And Polish

- recent successful provider/model persistence
- improved status bar/footer provider cues
- better suggestion-based errors for bad provider/model input

Success criteria:

- the tool reopens into the user's last working provider/model when appropriate
- invalid provider/model input yields helpful suggestions rather than generic failure

## Acceptance Criteria

1. A new user with GitHub Copilot credentials can run `chan` and reach a usable session immediately.
2. A user with only `OPENAI_API_KEY` can run `chan` and either land on OpenAI automatically or get a clear fallback/notice.
3. A user with no provider credentials gets a recoverable onboarding experience, not a crash or dead screen.
4. `/providers` clearly distinguishes connected, configured, and unavailable providers.
5. The model picker shows provider state, not only model names.
6. Recent successful selections are reused when still valid.
7. Provider/model errors tell the user exactly what to do next.
8. `/connect` supports both GitHub Copilot device auth and API-key-based providers through one consistent UX.

## Suggested Implementation Order

1. Build provider discovery snapshot and `/providers`.
2. Add startup fallback and provider-aware recoverable notices.
3. Build the provider auth registry and generic `/connect` flow.
4. Redesign the model picker to surface provider state and become the post-connect landing point.
5. Add recent successful selection persistence.
6. Polish `/status`, footer, and error wording.

## Out Of Scope For This Plan

- plugin-managed provider ecosystems similar to `opencode`
- full web-based account management UI
- automatic provider purchasing, billing, or quota management
- changing the existing permission model

## Verification Checklist

After implementation, verify these scenarios manually:

1. `chan` with GitHub Copilot configured
2. `chan` with only `OPENAI_API_KEY`
3. `chan` with only `ANTHROPIC_API_KEY`
4. `chan` with no provider credentials
5. `/model` switching between providers
6. `/providers` output before and after credential changes
7. reopening after a successful model switch