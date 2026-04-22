/**
 * [BoxLang]
 *
 * Copyright [2023] [Ortus Solutions, Corp]
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Electron Forge configuration
 * Docs: https://www.electronforge.io/~gitbook/mcp
 *
 * maker-pkg requires a valid macOS code signing identity and is only
 * included when MAC_SIGNING_IDENTITY is set (typically in CI).
 *
 * maker-flatpak requires D-Bus and a proper sandbox environment.
 * It is skipped when SKIP_FLATPAK=1 (set automatically in the Docker build image).
 */
const hasMacSigningIdentity = !!process.env.MAC_SIGNING_IDENTITY;
const skipFlatpak = process.env.SKIP_FLATPAK === "1";
module.exports = {
	packagerConfig: {
		name        : "BoxLang Starter Desktop",
		appId       : "io.boxlang.starter",
		executableName: 'boxlang-starter-electron',
		/**
		 * CRITICAL: Must remain false.
		 * BoxLang.js spawns runtime/bin/boxlang-miniserver as a real filesystem
		 * executable — asar archiving would break that path lookup entirely.
		 */
		asar        : false,
		// Forge auto-resolves .icns (mac) / .ico (win) from the base name
		icon        : "./public/includes/icon",
		/**
		 * Exclude dev-only files and directories from the packaged app.
		 * Forge uses regex arrays (tested against the relative path of each file).
		 * runtime/bin and runtime/lib are intentionally NOT excluded —
		 * they contain the bundled BoxLang MiniServer that the app spawns at startup.
		 */
		ignore      : [
			// Build tool configs and source assets not needed at runtime
			/^\/resources\/assets/,
			// Electron build output — never bundle the dist inside itself
			/^\/dist/,
			// Dev-only dot-directories
			/^\/\.boxlang\//,
			/^\/\.agents\//,
			/^\/\.claude\//,
			/^\/\.github\//,
			/^\/\.vscode\//,
			// Environment secret files
			/^\/\.env$/,
			/^\/\.env\./,
			// Vite config and related build tooling (not needed in packaged app)
			/^\/vite\.config\./,
			// Forge / builder config files themselves
			/^\/forge\.config\./,
		]
	},

	makers : [
		// ---------------------------------------------------------------
		// macOS — DMG installer (primary distribution format)
		// Only buildable on macOS runners
		// ---------------------------------------------------------------
		{
			name   : "@electron-forge/maker-dmg",
			config : {
				format : "ULFO",
				icon   : "./public/includes/icon.icns"
			}
		},
		// macOS — PKG flat package installer (alternate/MAS distribution)
		// Requires a valid macOS code signing identity — only included when
		// MAC_SIGNING_IDENTITY is set. Supply MAC_KEYCHAIN and
		// MAC_SIGNING_IDENTITY as env vars in CI.
		...( hasMacSigningIdentity ? [ {
			name      : "@electron-forge/maker-pkg",
			platforms : [ "darwin" ],
			config    : {
				keychain : process.env.MAC_KEYCHAIN || undefined,
				identity : process.env.MAC_SIGNING_IDENTITY
			}
		} ] : [] ),
		// ZIP fallback — runs on all platforms (darwin, win32, linux)
		// Useful for auto-update distribution and CI artifact archiving
		{
			name : "@electron-forge/maker-zip"
		},

		// ---------------------------------------------------------------
		// Windows — Squirrel installer
		// No-prompt, no-admin installer; Forge's standard Windows format.
		// Note: Windows was previously NSIS; Squirrel provides a simpler
		// but different install UX (no custom install directory picker).
		// ---------------------------------------------------------------
		{
			name   : "@electron-forge/maker-squirrel",
			config : {
				// NuGet package name — no spaces allowed
				name            : "BoxLangStarterDesktop",
				// User-facing installer name matches productName
				setupExe        : "BoxLang Starter Desktop Setup.exe",
				setupIcon       : "./public/includes/icon.ico",
				// Code signing — supply via env vars in CI; omit for unsigned dev builds
				certificateFile     : process.env.WIN_CERT_FILE || undefined,
				certificatePassword : process.env.WIN_CERT_PASS || undefined
			}
		},

		// ---------------------------------------------------------------
		// Linux — deb + rpm (official Forge Linux makers)
		// Forge does not ship an official AppImage maker; use deb/rpm
		// for Debian/Ubuntu and RHEL/Fedora distributions respectively.
		// maker-deb runs on macOS too (via brew dpkg/fakeroot) for local testing.
		// maker-rpm is restricted to Linux hosts only — rpmbuild requires a
		// real Linux filesystem layout (/usr/share, etc.) not present on macOS.
		// ---------------------------------------------------------------
		{
			name   : "@electron-forge/maker-deb",
			config : {
				options : {
					icon       : "./public/includes/icon.iconset/icon.png",
					categories : [ "Utility" ]
				}
			}
		},
		{
			name      : "@electron-forge/maker-rpm",
			platforms : [ "linux" ],
			config    : {
				options : {
					icon       : "./public/includes/icon.iconset/icon.png",
					categories : [ "Utility" ],
					// Required field by rpmbuild spec validation
					license    : "Apache-2.0"
				}
			}
		},

		// ---------------------------------------------------------------
		// Linux — Flatpak (sandboxed, distribution-agnostic)
		// Requires: flatpak, flatpak-builder, eu-strip (elfutils), and
		// the Flathub remote:
		//   flatpak remote-add --if-not-exists --user flathub \
		//     https://dl.flathub.org/repo/flathub.flatpakrepo
		// Linux hosts only. Skipped in Docker (SKIP_FLATPAK=1) because
		// flatpak-builder requires D-Bus and a proper sandbox that is
		// not available in a plain container. Built in CI (ubuntu-latest).
		// ---------------------------------------------------------------
		...( skipFlatpak ? [] : [ {
			name      : "@electron-forge/maker-flatpak",
			platforms : [ "linux" ],
			config    : {
				options : {
					icon       : "./public/includes/icon.iconset/icon.png",
					categories : [ "Utility" ]
				}
			}
		} ] )
	],

	plugins : [],

	// Output directory — keep consistent with the previous electron-builder default
	// so CI artifact globs and .gitignore entries remain valid
	outDir : "dist/electron"
};
