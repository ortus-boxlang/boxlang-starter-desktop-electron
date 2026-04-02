# BoxLang Electron Starter

A starter template for building cross-platform desktop applications with [BoxLang](https://www.boxlang.io), [Electron](https://www.electronjs.org), [Vite](https://vite.dev), and [Alpine.js](https://alpinejs.dev).

The app embeds a BoxLang MiniServer as a local HTTP server (bound to `127.0.0.1`) and renders it inside an Electron window — giving you a full server-side BoxLang runtime with a native desktop shell.

---

## Features

- **BoxLang MiniServer** — full server-side runtime embedded in the desktop app, auto-starts and auto-restarts on crash
- **Electron** — native window, system tray, OS notifications, taskbar integration on Windows/Linux/macOS
- **Vite** — fast asset pipeline with hot module replacement in development
- **Alpine.js** — lightweight reactivity for the UI
- **SCSS** — a ready-made design system with CSS variables, grid, and components
- **electron-builder** — one-command packaging to DMG (macOS), NSIS installer (Windows), and AppImage (Linux)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| BoxLang | 1.6.0 | Only needed for development or to package the MiniServer |

> **Packaged app users** do not need BoxLang installed — the MiniServer is bundled inside the app via `npm run package:full`.

---

## Quick Start

```bash
# 1. Install Node dependencies
npm install

# 2. Start development (Vite + Electron together)
npm run dev
```

`npm run dev` starts the Vite dev server on `http://127.0.0.1:3000` and then launches Electron after a 3-second delay. The BoxLang MiniServer starts automatically on port `59700`.

---

## Project Structure

```
boxlang-starter-electron/
├── .electron/                  # Electron main process (Node.js)
│   ├── Main.js                 # Entry point, window lifecycle, app settings
│   ├── BoxLang.js              # BoxLang MiniServer process management
│   ├── TrayMenu.js             # System tray icon and context menu
│   ├── AppMenu.js              # Native application menu (File/Edit/View/Help)
│   └── Shortcuts.js            # Global keyboard shortcuts
├── .miniserver/                # BoxLang MiniServer distribution
│   ├── Package.bx              # Download/package script (run via npm)
│   └── bin/                    # MiniServer executables (after packaging)
├── includes/
│   ├── helpers/
│   │   └── ViteHelper.bx       # Resolves Vite assets in BoxLang templates
│   ├── icon.iconset/           # PNG icons (16×16 through 1024×1024)
│   ├── icon.icns               # macOS dock icon
│   └── icon.ico                # Windows taskbar/installer icon
├── resources/
│   └── assets/
│       ├── js/
│       │   ├── app.js          # JavaScript entry point (Alpine.js init)
│       │   └── stores/
│       │       └── modal-store.js
│       ├── scss/
│       │   └── app.scss        # SCSS entry point
│       └── fonts/              # Bundled web fonts (Poppins)
├── scripts/
│   └── generate-icons.js       # Generates includes/icon.ico for Windows
├── views/
│   └── loading.html            # Loading screen shown while MiniServer starts
├── .boxlang.json               # BoxLang runtime configuration
├── Application.bx              # BoxLang application listener (sessions, mappings)
├── index.bxm                   # Home page template
├── miniserver.json             # BoxLang MiniServer configuration (port, host, webroot…)
├── vite.config.mjs             # Vite configuration
├── package.json                # Node scripts, dependencies, electron-builder config
└── .bvmrc                      # BoxLang version pin (1.6.0)
```

**Generated at build/runtime:**

```
includes/resources/             # Vite build output (hashed CSS, JS, fonts)
dist/electron/                  # electron-builder output (installers)
.database/                      # SQLite database (runtime, gitignored)
```

---

## Development

### Start everything

```bash
npm run dev
```

Runs Vite (`http://127.0.0.1:3000`) and Electron concurrently. Electron launches after 3 seconds to allow Vite to initialize. BoxLang MiniServer starts automatically on `http://127.0.0.1:59700`.

### Electron only (Vite already running)

```bash
npm run start
```

### Production build preview (no HMR)

```bash
npm run prod
```

Runs `vite build` then starts Electron using the compiled assets.

### Vite-only asset preview

```bash
npm run preview
```

---

## BoxLang MiniServer

The app spawns a BoxLang MiniServer as a child process. In development it uses a globally installed `boxlang-miniserver`. For a packaged/distributable build you must bundle the MiniServer locally first.

### Package the MiniServer for distribution

```bash
# Download and extract MiniServer into .miniserver/ (reads version from .bvmrc)
npm run package:miniserver

# Force re-download even if already packaged
npm run package:miniserver:force
```

This downloads BoxLang MiniServer `1.6.0` and extracts it to `.miniserver/bin/` and `.miniserver/lib/`. The packaged app uses these binaries instead of the global installation.

### Server configuration

All BoxLang MiniServer settings live in `miniserver.json` at the project root:

| Setting | Default | Description |
|---------|---------|-------------|
| `port` | `59700` | Local HTTP port |
| `host` | `127.0.0.1` | Bind address (localhost only) |
| `webroot` | `.` | Web root directory |
| `serverHome` | `.miniserver/.boxlang` | BoxLang runtime data directory |
| `rewrites` | `true` | Enable URL rewriting |
| `debug` | `false` | Enable debug/verbose output |

App-level settings (window size, app name, etc.) are configured in `.electron/Main.js` under `globalSettings`:

| Setting | Default | Description |
|---------|---------|-------------|
| `serverPort` | read from `miniserver.json` | Local HTTP port |
| `serverDebugMode` | `true` in dev, `false` in prod | BoxLang `--debug` flag |
| `appName` | `"BoxLang Starter Desktop"` | Window title and tray tooltip |
| `windowWidth` / `windowHeight` | `1200` / `800` | Initial window dimensions |

BoxLang runtime settings (session timeout, datasources, caching, logging) live in `.boxlang.json` at the project root.

---

## Building & Packaging

### 1. Generate the Windows icon (first time only)

Windows packaging requires `includes/icon.ico`. Generate it from the existing PNG assets:

```bash
npm run generate:icons
```

> Requires `png-to-ico` which is included as a dev dependency.

### 2. Package the application

```bash
# Vite build + electron-builder (requires .miniserver/ to be populated first)
npm run package

# Full pipeline: package MiniServer, then build and package the app
npm run package:full
```

Output goes to `dist/electron/`.

| Platform | Output | Format |
|----------|--------|--------|
| macOS | `BoxLang Starter Desktop.dmg` | DMG |
| Windows | `BoxLang Starter Desktop Setup.exe` | NSIS installer |
| Linux | `boxlang-starter-electron-1.0.0.AppImage` | AppImage |

### Platform notes

**macOS** — Requires `includes/icon.icns`. No code signing is configured by default; for distribution outside the App Store you will need to add `mac.identity` and set up notarization in `package.json`.

**Windows** — Requires `includes/icon.ico` (generate with `npm run generate:icons`). The NSIS installer is non-silent with desktop and start menu shortcuts.

**Linux** — AppImage with category `Utility`. Runs on most distributions without installation.

---

## OS Integration

The app integrates with each OS's native desktop environment:

### System Tray (all platforms)
- Tray icon persists when the window is closed/hidden
- Context menu: Show Application, Hide Application, Server Status, Restart BoxLang Server, Open in Browser, Quit
- Single-click the tray icon to toggle the window

### Window close behavior
- **macOS** — closing the window hides it (Cmd+Q or File → Quit to exit)
- **Windows / Linux** — closing the window hides it to tray (requires tray icon); if tray fails, window closes normally

### macOS Dock
- App icon set from `includes/icon.icns`
- Dock badge shows `…` while the server is starting, cleared when ready
- Clicking the dock icon re-shows the window if it was hidden

### Windows Taskbar
- Overlay icon shown on the taskbar button
- Progress bar is shown (indeterminate) while the server starts

### Desktop Notifications
Fired automatically at key lifecycle events:

| Event | Notification |
|-------|-------------|
| Server started | "BoxLang Server Started — port 59700" |
| Server crashed | "BoxLang Server Crashed — restarting in 5s" |
| Manual restart | "BoxLang Server — Restarting server…" |

### Global Keyboard Shortcuts
These work system-wide (even when the app window is not focused):

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + L` | Show / hide window |
| `Cmd/Ctrl + Shift + B` | Restart BoxLang server |
| `Cmd/Ctrl + Shift + O` | Open app in default browser |

---

## Asset Pipeline

Vite processes `resources/assets/` and outputs hashed files to `includes/resources/`. BoxLang templates use `ViteHelper.bx` to resolve the correct URLs in both development and production.

### Adding assets in BoxLang templates

```html
<bx:script>
    viteHelper = application.viteHelper; // initialized in Application.bx
</bx:script>

<!-- CSS -->
<bx:output>#viteHelper.styles( "styles" )#</bx:output>

<!-- JavaScript -->
<bx:output>#viteHelper.scripts( "app" )#</bx:output>
```

In development, `ViteHelper` points to the Vite HMR server (`http://127.0.0.1:3000`). In production, it reads `includes/resources/.vite/manifest.json` and outputs the hashed filenames.

### Adding JavaScript

Place files under `resources/assets/js/`. Import them from `app.js`:

```javascript
// resources/assets/js/app.js
import '../scss/app.scss';
import Alpine from 'alpinejs';
Alpine.start();
```

### Adding SCSS

Place partials under `resources/assets/scss/` and import them in `app.scss`. The starter includes a design system with CSS variables, a 12-column grid, buttons, forms, and cards.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite + Electron in development mode |
| `npm run start` | Start Electron only (Vite must already be running) |
| `npm run build` | Vite production build |
| `npm run prod` | Vite build + start Electron |
| `npm run preview` | Preview Vite build in browser |
| `npm run package` | Vite build + electron-builder |
| `npm run package:miniserver` | Download and package BoxLang MiniServer |
| `npm run package:miniserver:force` | Force re-download MiniServer |
| `npm run package:full` | Package MiniServer + build + electron-builder |
| `npm run generate:icons` | Generate `includes/icon.ico` for Windows |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |

---

## Configuration Reference

### `.electron/Main.js` — `globalSettings`

The central app-level configuration object. Edit this to change app-level behavior:

```js
const globalSettings = {
    serverPort,                // Read from miniserver.json (default 59700)
    serverDebugMode: isDevelopment,  // true in dev, false in production
    appName: "BoxLang Starter Desktop",
    windowHeight: 800,
    windowWidth: 1200,
    projectRoot,               // Absolute path to the project root
    path,                      // Node.js path module
    loadingView,               // Path to views/loading.html
    isDevelopment              // true when NODE_ENV=development
};
```

### `miniserver.json`

BoxLang MiniServer settings: port, bind address, web root, server home directory, URL rewrites, and debug mode. Edit this file to configure the embedded HTTP server without touching application code.

### `.boxlang.json`

BoxLang runtime settings: session management, datasources, caching, logging, security restrictions, and module paths. See the [BoxLang documentation](https://boxlang.ortusbooks.com) for all available options.

### `vite.config.mjs`

- Dev server: `http://127.0.0.1:3000`
- Build output: `includes/resources/`
- Entry points: `resources/assets/js/app.js`, `resources/assets/scss/app.scss`

### `package.json` — `build` (electron-builder)

The `build` key controls the electron-builder configuration. Key options:

```json
{
  "build": {
    "appId": "io.boxlang.starter",
    "asar": true,
    "asarUnpack": [".miniserver/**"],
    "nsis": { "oneClick": false, "createDesktopShortcut": true },
    "linux": { "category": "Utility" }
  }
}
```

> `asarUnpack` is required for `.miniserver/` — JVM executables cannot run from inside an asar archive.

---

## Troubleshooting

### BoxLang server won't start

- **Global install path issue** — the app adds `/usr/local/bin` to `PATH` automatically, but if your BoxLang installation is elsewhere, run: `export PATH="/your/boxlang/bin:$PATH"` before starting the app
- **Port already in use** — change `serverPort` in `globalSettings` and ensure no other process is using the port
- **Packaged miniserver missing** — run `npm run package:miniserver` to download it

### Tray icon not appearing

- Ensure `includes/icon.iconset/icon_16x16.png` exists
- On some Linux desktops (GNOME), system tray requires a shell extension (e.g. *AppIndicator Support*)

### Assets not loading in production

- Run `npm run build` before `npm run package` — the Vite manifest must exist in `includes/resources/.vite/manifest.json`
- Make sure `resources/assets/` is excluded from electron-builder (source files should not be packaged)

### Windows installer fails (missing icon)

- Run `npm run generate:icons` to create `includes/icon.ico` before packaging

### DevTools open on every launch

- Only in `NODE_ENV=development` — DevTools are disabled in packaged production builds

---

## License

Apache-2.0 — see [LICENSE](LICENSE) for details.

Built with [BoxLang](https://www.boxlang.io) by [Ortus Solutions](https://www.ortussolutions.com).
