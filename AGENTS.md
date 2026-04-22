# BoxLang Electron Desktop Starter - Agent Instructions (Canonical)

This file is the canonical workspace instruction source for coding agents in this repository.

If another instruction file exists (for example, .github/copilot-instructions.md), treat this file as the source of truth.

## Project Context

This repository is a BoxLang desktop starter that combines:

- Electron for the desktop shell
- BoxLang MiniServer for the local app runtime
- Vite for frontend assets
- Alpine.js and Bootstrap for UI behavior and styling

The starter runs a local HTTP server and loads it in Electron.

## Architecture Snapshot

- app/electron/Main.js: Electron bootstrap, window lifecycle, logging, and component wiring.
- app/electron/BoxLang.js: BoxLang MiniServer process management, readiness checks, restart strategy.
- app/electron/AppMenu.js: Application menu definitions.
- app/electron/TrayMenu.js: System tray behavior and status menu.
- app/electron/Shortcuts.js: Global keyboard shortcuts.
- public/Application.bx: App settings, datasource config, and app startup hook.
- public/includes/helpers/ViteHelper.bx: Vite dev/prod asset resolution helper.
- runtime/Package.bx: MiniServer packager script that reads .bvmrc.
- miniserver.json: MiniServer host, port, webroot, and runtime settings.

## Runtime and Packaging Rules

- The packaged runtime lives under runtime/bin and runtime/lib.
- BoxLang.js prefers packaged MiniServer first, then falls back to global boxlang-miniserver.
- Runtime packaging is managed by runtime/Package.bx, not .miniserver/Package.bx.
- .bvmrc controls which MiniServer version is downloaded.
- On Unix-like systems, executable permissions for runtime/bin are enforced during packaging and startup.

## Development Workflow

- npm run dev: Start Vite and Electron for local development.
- npm run start: Start Electron only (assumes Vite dev server is already running if needed).
- npm run build: Build frontend assets into public/includes/resources.
- npm run package:miniserver: Download/extract BoxLang MiniServer into runtime/.
- npm run package: Build assets and create desktop packages.
- npm run package:full: Package MiniServer first, then package the desktop app.

## BoxLang Coding Rules

- Use tag-based component syntax like bx:http {} and bx:zip {}.
- Never instantiate components via new bx:....
- Keep spacing consistent with this codebase: spaces around parentheses, operators, and braces.
- For CLI scripts, use CliGetArgs() and read options plus positionals.
- Use expandPath() for path resolution and verify file/directory existence before destructive operations.

## AI Skills and Agent Assets

This starter includes AI skill packs for coding agents.

- Primary skills location: .agents/skills/*/SKILL.md
- Mirror/compat location: .claude/skills/*/SKILL.md
- Skill lock file: skills-lock.json

When updating agent behavior or project guidance, keep references and folder names aligned with .agents/skills.

## Packaging Tool

This project uses Electron Forge for building distributables (forge.config.cjs).

- MCP docs reference: <https://www.electronforge.io/~gitbook/mcp>
- Config file: forge.config.cjs (CommonJS, required for Forge compatibility).
- asar is always false. BoxLang MiniServer is spawned as a real filesystem executable and cannot be inside an asar archive.
- Windows installer uses Squirrel (Forge default), not NSIS.

## Contribution Notes for Agents

- Preserve modular boundaries in app/electron/* instead of moving logic into a single file.
- Keep process lifecycle safety: startup timeout, readiness checks, and graceful shutdown behavior.
- Preserve cross-platform behavior for macOS, Windows, and Linux (icons, shortcuts, packaging targets).
- Do not remove fallback behavior between packaged and global MiniServer unless explicitly requested.
- Never enable asar in forge.config.cjs. It will break MiniServer process spawning.
