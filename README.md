# BoxLang Electron Starter

A starter template for building cross-platform desktop applications with BoxLang, Electron, Vite, and Alpine.js.

The app runs a local BoxLang MiniServer and loads it inside an Electron window, so you get a native desktop shell around a BoxLang application without introducing a second backend stack.

## Features

- BoxLang MiniServer embedded as the local application runtime.
- Electron window, menu, tray, notifications, and native integration hooks.
- Vite-powered frontend assets with a fast development loop.
- Alpine.js for lightweight client-side interactivity.
- electron-builder packaging for macOS, Windows, and Linux.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 18+ | Required for Electron, Vite, and packaging. |
| BoxLang | Current CLI | Needed for development fallback and packaging the MiniServer. |

Packaged app users do not need BoxLang installed if you distribute the app with `npm run package:full`.

## Quick Start

```bash
npm install
npm run dev
```

`npm run dev` starts Vite first, waits for the dev server port, and then launches Electron. Electron starts the BoxLang MiniServer and loads the local BoxLang app after the server responds over HTTP.

## Configuration Model

- `miniserver.json` is the authority for BoxLang MiniServer settings such as host, port, webroot, serverHome, rewrites, and debug defaults.
- `.bvmrc` is the authority for which MiniServer version gets packaged by `.miniserver/Package.bx`.
- `app/electron/Main.js` and `app/electron/BoxLang.js` consume those values plus explicit environment overrides.
- Electron writes `.miniserver/runtime/miniserver.runtime.json` before spawn so developers can keep comments in `miniserver.json` even when the active MiniServer binary expects plain JSON.

Supported environment overrides:

| Variable | Purpose |
| --- | --- |
| `BOXLANG_MINISERVER_HOST` | Override server host. |
| `BOXLANG_MINISERVER_PORT` | Override server port. |
| `BOXLANG_MINISERVER_WEBROOT` | Override server webroot. |
| `BOXLANG_MINISERVER_SERVER_HOME` | Override the MiniServer home directory. |
| `BOXLANG_MINISERVER_REWRITES` | Override rewrite support. |
| `BOXLANG_MINISERVER_DEBUG` | Override debug mode. |
| `VITE_HOST` | Override the Vite host used by `ViteHelper.bx`. |
| `VITE_PROTOCOL` | Override the Vite protocol used by `ViteHelper.bx`. |

## Development Workflow

### Run everything

```bash
npm run dev
```

This starts Vite and Electron together.

### Run Electron only

```bash
npm run start
```

Use this only when the Vite dev server is already running.

### Run a production preview

```bash
npm run prod
```

This builds frontend assets and launches Electron against the built output.

## Packaging Workflow

### Package the MiniServer

```bash
npm run package:miniserver
```

This reads `.bvmrc`, downloads the requested BoxLang MiniServer, and extracts it to `.miniserver/bin/` and `.miniserver/lib/`.

### Force a fresh MiniServer download

```bash
npm run package:miniserver:force
```

### Build the desktop app

```bash
npm run package
```

### Full packaging flow

```bash
npm run package:full
```

This packages the MiniServer first and then builds the Electron distributable.

## Where To Make Changes

| Area | Primary files |
| --- | --- |
| BoxLang templates and request flow | `public/index.bxm`, `public/Application.bx`, `public/views/` |
| Frontend JavaScript | `resources/assets/js/` |
| Frontend styles | `resources/assets/scss/` |
| Electron desktop behavior | `app/electron/` |
| BoxLang runtime configuration | `.boxlang.json`, `miniserver.json` |

## Project Structure

```text
app/electron/              Electron main-process code
.miniserver/               MiniServer packaging assets and downloaded runtime
public/                    BoxLang webroot (Application.bx, index.bxm, views, includes)
resources/assets/          Frontend source assets
miniserver.json            Source-of-truth MiniServer configuration
vite.config.mjs            Vite configuration
package.json               Node scripts and Electron packaging config
```

Generated paths:

```text
.miniserver/runtime/       Generated plain-JSON runtime config for MiniServer startup
public/includes/resources/ Vite build output
dist/electron/             Packaged desktop artifacts
.database/                 SQLite data created at runtime
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite and Electron in development mode. |
| `npm run start` | Start Electron only. |
| `npm run build` | Build frontend assets with Vite. |
| `npm run prod` | Build assets and run Electron against production output. |
| `npm run preview` | Preview the Vite build in a browser. |
| `npm run package` | Package the Electron app. |
| `npm run package:miniserver` | Download and package the BoxLang MiniServer. |
| `npm run package:miniserver:force` | Force a fresh MiniServer download. |
| `npm run package:full` | Package the MiniServer and then the Electron app. |
| `npm run generate:icons` | Generate `public/includes/icon.ico` for Windows packaging. |

## Troubleshooting

### BoxLang server will not start

- If you are using the global fallback runtime, make sure `boxlang-miniserver` is on your `PATH`.
- If you are packaging for distribution, run `npm run package:miniserver` first.
- If the configured port is already in use, change it in `miniserver.json` or override it with `BOXLANG_MINISERVER_PORT`.

### Comments in `miniserver.json`

- Keep comments in `miniserver.json` if they help developers.
- Electron will generate a plain runtime snapshot before spawn so older or stricter MiniServer binaries can still boot.

### Missing macOS icon warning

- The starter falls back to the PNG icon set if `public/includes/icon.icns` is missing.
- Add a proper `public/includes/icon.icns` before shipping a signed macOS build.

### Assets missing in production

- Run `npm run build` before packaging if you are not using `npm run package`.
- Make sure `public/includes/resources/.vite/manifest.json` exists after the build.

## CI

The GitHub Actions workflow uses `ortus-boxlang/setup-boxlang@1.3.0` and packages the desktop app on macOS, Windows, and Linux.

## License

Apache-2.0.
