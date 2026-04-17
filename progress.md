# Progress

## 2026-04-17

- Replaced the picker dialogs' fake 8-row windows with real Silvery `ListView` scroll regions in the model, resume, and rewind modals, so the full item sets now scroll with keyboard and mouse instead of being manually sliced to a fixed window; also rewrote the bottom shortcut hints to use normal foreground text with highlighted key labels instead of low-contrast dim-only text, then rebuilt and reinstalled the local binaries.
- Added Claude Opus 4.7 to the curated `/model` picker presets, normalized the Anthropic preset IDs in that shortlist to Anthropic's current hyphenated aliases, and updated Opus 4.5 through 4.7 cost mapping so usage estimates stay correct for the newer Opus family.