#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Resolve Go engine binary: check next to the launcher, then in PATH
const localEngine = join(root, "engine", "go-cli");
const enginePath = existsSync(localEngine) ? localEngine : "go-cli";

// Set env so the TUI picks it up
process.env["GOCLI_ENGINE_PATH"] = enginePath;

// Forward CLI args as env overrides
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--model" || args[i] === "-m") && args[i + 1]) {
    process.env["GOCLI_MODEL"] = args[++i];
  } else if ((args[i] === "--mode") && args[i + 1]) {
    process.env["GOCLI_MODE"] = args[++i];
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`Usage: go-cli [options]

Options:
  --model, -m <provider/model>  Model to use (default: anthropic/claude-sonnet-4-20250514)
  --mode <plan|fast>            Execution mode (default: plan)
  --help, -h                    Show this help`);
    process.exit(0);
  }
}

// Launch the TUI
await import("../dist/index.js");
