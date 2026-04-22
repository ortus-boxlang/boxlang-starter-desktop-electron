# BoxLang Electron Desktop Starter - Copilot Bridge Instructions

Use AGENTS.md at repository root as the canonical instruction source for this project.

This file remains as a compatibility bridge so tools that prioritize .github/copilot-instructions.md still receive core guardrails.

## Canonical Source

- Primary instructions: AGENTS.md
- If any conflict exists, AGENTS.md wins.

## Critical Guardrails

- Keep modular boundaries in app/electron/* and avoid collapsing logic into a single file.
- Preserve process lifecycle safety in BoxLang MiniServer startup and shutdown paths.
- Preserve cross-platform behavior (macOS, Windows, Linux) for packaging, icons, and shortcuts.
- Do not remove packaged-runtime-first fallback to global boxlang-miniserver unless explicitly requested.
- Never enable asar in forge.config.cjs, because MiniServer spawning requires real filesystem paths.
