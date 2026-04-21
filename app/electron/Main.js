/* eslint-disable no-unused-vars */
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
import { app, BrowserWindow, nativeImage, dialog } from "electron";
import { fileURLToPath } from 'url';

// Import our modular components
import { AppMenu } from './AppMenu.js';
import { BoxLang } from './BoxLang.js';
import { Shortcuts } from './Shortcuts.js';
import { TrayMenu } from './TrayMenu.js';

// Dynamic imports
const path = await import( "path" );
process.env.PATH = process.env.PATH + ":/usr/local/bin";

// Get the current file name
const thisFileName = fileURLToPath( import.meta.url );
// Get the name of the directory
const thisDirName = path.dirname( thisFileName );
// The path to the root of the project: two levels up from the current directory
const projectRoot = path.resolve( thisDirName, "../../" );
// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Global references to components and main window
let mainWindow;
let trayMenu;
let appMenu;
let shortcuts;
let boxLang;

/**
 * ----------------------------------------------------------
 * Global Application Settings
 * --------------------------------------------------------
 *  You can change these settings to customize the app as you see fit.
 */
const APP_DIRECTORY_NAME = "boxlang-starter-desktop"
const APP_SERVER_PORT = process.env.BOXLANG_PORT ? parseNumber( process.env.BOXLANG_PORT ) : 59700
const APP_HOME = process.env.BOXLANG_HOME
	? path.resolve( process.env.BOXLANG_HOME )
	: path.join( app.getPath( 'home' ), '.' + APP_DIRECTORY_NAME )
const APP_HOME_SOURCE = process.env.BOXLANG_HOME ? 'env BOXLANG_HOME' : 'default user home'

if( isDevelopment ) {
	console.log( '[BoxLang] Running in development mode' );
	console.log( '[BoxLang] App home (' + APP_HOME_SOURCE + '): ' + APP_HOME )
}

const globalSettings = {
	// This is used to store app data (logs, databases, etc.) in a consistent location across platforms.
	// Change as you see fit
	appDirectoryName: APP_DIRECTORY_NAME,
	// The app home directory (where BoxLang and your app will store its data), can be overridden with BOXLANG_HOME env var
	// Note: We resolve the path here to ensure it's an absolute path, whether it's provided via env var or defaulted
	// By default, this uses a hidden folder in the user's home directory
	appHome: APP_HOME,
	// The port this app will run under
	serverPort: APP_SERVER_PORT,
	// Debug mode can be enabled via BOXLANG_DEBUG env var (true/false/1/0) or defaults to true in development mode
    serverDebugMode: process.env.BOXLANG_DEBUG ? parseBoolean( process.env.BOXLANG_DEBUG ) : isDevelopment,
	// The server origin URL (used for API calls, etc.)
    serverOrigin: `http://localhost:${APP_SERVER_PORT}`,
	// Window Defaults
    appName: "BoxLang Starter Desktop",
    windowHeight: 1024,
    windowWidth: 1300,
    // Project paths
    projectRoot,
    path,
    // The loading view path
	loadingView: path.join( projectRoot, "public/views/loading.html" ),
	isDevelopment
};

// Set app name early (before app is ready)
app.setName( globalSettings.appName );

// Initialize component instances
trayMenu = new TrayMenu( globalSettings );
appMenu = new AppMenu( globalSettings );
shortcuts = new Shortcuts( globalSettings );
boxLang = new BoxLang( globalSettings );

/**
 * -----------------------------------------------------------
 * Electron Listeners
 * -----------------------------------------------------------
 */

// Ensure single instance application
const gotLock = app.requestSingleInstanceLock?.() ?? true;
if ( !gotLock ) {
	// Another instance is already running, exit this one
	app.quit();
}
let appIsQuitting = false;

/** extra safety for dev exits (Ctrl+C / kill) */
process.on( 'SIGINT', () => { boxLang.stop(); app.quit(); } );
process.on( 'SIGTERM', () => { boxLang.stop(); app.quit(); } );

/**
 * Create the main application window once Electron is ready
 */
app.whenReady().then( () => {
	// Ensure app name is set (sometimes needed for development)
	app.setName( globalSettings.appName );

	// Set about panel options (helps with app name on macOS)
	if ( process.platform === 'darwin' ) {
	app.setAboutPanelOptions( {
		applicationName: globalSettings.appName,
		applicationVersion: "1.0.0",
		copyright: "© 2025 Ortus Solutions, Corp"
	} );
	}

	// Create application menu using modular component
	appMenu.create( {
		quit: handleQuit,
		showOrCreateWindow: showOrCreateWindow,
		reloadWindow: reloadWindow,
		forceReloadWindow: forceReloadWindow,
		restartBoxLang: () => boxLang.restart(),
		closeWindow: closeWindow,
		toggleDevTools: toggleDevTools,
		showAbout: showAboutDialog
	} );

	// Create the main application window
	createWindow();

	// Create system tray using modular component
	trayMenu.create( {
		createWindow: createWindow,
		restartBoxLang: () => boxLang.restart(),
		quit: handleQuit
	} );

	// Register global shortcuts using modular component
	shortcuts.register( {
		restartBoxLang: () => boxLang.restart()
	} );

	// Update component references after everything is created
	updateComponentReferences();

    boxLang.start();
} );

 // Graceful shutdown of BoxLang process
app.on( "before-quit", () => {
    appIsQuitting = true;
    boxLang.setQuitting( true );
    shortcuts.unregister(); // Use modular shortcuts component
    trayMenu.destroy(); // Use modular tray component
	boxLang.stop(); // Use modular BoxLang component
} );

// Quit when all windows are closed (except on macOS)
app.on( 'window-all-closed', () => {
    if ( process.platform !== 'darwin' ) {
		app.quit();
		// before-quit will run and stop BoxLang
	}
} );

app.on( 'activate', () => {
    if ( BrowserWindow.getAllWindows().length === 0 ) {
        createWindow();
        updateComponentReferences();
        if ( !boxLang.isRunning() ) {
            boxLang.start();
        }
    } else if ( mainWindow ) {
        // Window exists but may be hidden (e.g. user clicked dock icon after closing to tray)
        mainWindow.show();
        mainWindow.focus();
    }
} );

//  if a second instance is launched, focus the existing window
app.on?.( 'second-instance', () => {
  const [ win ] = BrowserWindow.getAllWindows();
  if ( win ) { win.show(); win.focus(); }
} );

/**
 * -----------------------------------------------------------
 * MENU CALLBACKS & UTILITY FUNCTIONS
 * -----------------------------------------------------------
 */

/**
 * Handle application quit
 */
function handleQuit () {
    appIsQuitting = true;
    app.quit();
}

/**
 * Show or create window
 */
function showOrCreateWindow () {
    if ( mainWindow ) {
        mainWindow.show();
        mainWindow.focus();
    } else {
        createWindow();
        updateComponentReferences();
    }
}

/**
 * Reload window
 */
function reloadWindow () {
    if ( mainWindow ) {
        mainWindow.reload();
    }
}

/**
 * Force reload window
 */
function forceReloadWindow () {
    if ( mainWindow ) {
        mainWindow.webContents.reloadIgnoringCache();
    }
}

/**
 * Close window
 */
function closeWindow () {
    mainWindow?.close();
}

/**
 * Toggle developer tools
 */
function toggleDevTools () {
    if ( mainWindow ) {
        mainWindow.webContents.toggleDevTools();
    }
}

/**
 * Update references in all components
 */
function updateComponentReferences () {
    const updateTrayCallback = () => {
        trayMenu.updateMenu( {
            createWindow: createWindow,
            restartBoxLang: () => boxLang.restart(),
            quit: handleQuit
        } );
    };

    trayMenu.setReferences( {
        boxLang: boxLang,
        mainWindow,
        appIsQuitting
    } );

    shortcuts.setReferences( {
        mainWindow
    } );

    boxLang.setReferences( {
        mainWindow,
        updateCallback: updateTrayCallback
    } );
}

/**
 * -----------------------------------------------------------
 * HELPERS
 * -----------------------------------------------------------
 */

/**
 * Show about dialog
 */
function showAboutDialog () {
	const appVersion = app.getVersion();
	dialog.showMessageBox( mainWindow, {
		type: 'info',
		title: 'About ' + globalSettings.appName,
		message: globalSettings.appName,
		detail: `Version: ${appVersion}\n${globalSettings.appName}\nBuilt with Electron and Vite\n\nServer Port: ${globalSettings.serverPort}\nDebug Mode: ${globalSettings.serverDebugMode ? 'Enabled' : 'Disabled'}`,
		buttons: [ 'OK' ],
        icon: nativeImage.createFromPath( resolveAsset( 'public', 'includes', 'icon.iconset', 'icon_128x128.png' ) )
	} );
}

/**
 * Create the main application window
 */
function createWindow () {
    mainWindow = new BrowserWindow( {
        width: globalSettings.windowWidth,
        height: globalSettings.windowHeight,
		title: globalSettings.appName,
		// Show window when ready in production, immediately in development
		show: isDevelopment,
		// NOTE: icon is used on Windows/Linux. Prefer .ico on Windows, .png on Linux.
		icon: process.platform === 'win32'
        ? resolveAsset( 'public', 'includes', 'icon.ico' )
        : resolveAsset( 'public', 'includes', 'icon.iconset', 'icon_32x32.png' ),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
			devTools: isDevelopment
        }
    } );

	// Open dev tools automatically in development
	if ( isDevelopment ) {
		mainWindow.webContents.openDevTools();
	}

	// Windows-only: taskbar overlay icon (ideally 16x16 PNG)
	if ( process.platform === 'win32' ) {
		const overlayIcon = nativeImage.createFromPath(
            resolveAsset( 'public', 'includes', 'icon.iconset', 'icon_16x16.png' )
		);
		if ( !overlayIcon.isEmpty() ) {
			mainWindow.setOverlayIcon( overlayIcon, globalSettings.appName );
		}
	}

	// macOS-only: set the dock icon (must be .icns)
	if ( process.platform === 'darwin' && app?.dock ) {
        const dockIconIcns = resolveAsset( 'public', 'includes', 'icon.icns' );
        const dockIconPng = resolveAsset( 'public', 'includes', 'icon.iconset', 'icon_128x128.png' );

		try {
			app.dock.setIcon( dockIconIcns );
		} catch ( error ) {
			console.warn( "Could not set dock icon (.icns):", error.message );
			// Fallback to PNG
			try {
				app.dock.setIcon( dockIconPng );
				console.log( "Successfully set dock icon using PNG fallback" );
			} catch ( pngError ) {
				console.warn( "Could not set dock icon (PNG fallback):", pngError.message );
			}
		}
	}

	// Load the loading view first
    mainWindow.loadFile( globalSettings.loadingView );

	// Show window when ready (for production)
	mainWindow.once( 'ready-to-show', () => {
		//if ( !isDevelopment ) {
			mainWindow.show();
		//}
	} );

    mainWindow.on( 'closed', () => {
        mainWindow = null;
        updateComponentReferences();
    } );

	// Minimize to tray on close (macOS: always hide; Windows/Linux: hide when tray exists)
	mainWindow.on( 'close', ( e ) => {
		if ( !appIsQuitting ) {
			if ( process.platform === 'darwin' || trayMenu.hasTray() ) {
				e.preventDefault();
				mainWindow.hide();
			}
		}
	} );
}

/**
 * This method is used to create a link to a route in the BoxLang server
 * by returning the full URL to the route based on the server origin and the provided path.
 *
 * @param {string} routePath - The path to the route (e.g., "/api/status")
 * @returns {string} - The full URL to the route (e.g., "http://localhost:59700/api/status")
 */
function buildLink ( routePath ) {
	return `${globalSettings.serverOrigin}${routePath}`;
}

/**
 *  Resolve the path to an asset
 *
 * @param  {...any} p Path parts to the asset
 *
 * @returns {string} The resolved path
 */
function resolveAsset ( ...p ) {
  return globalSettings.path.join( globalSettings.projectRoot, ...p );
}

/**
 * Parse a boolean value from various string representations
 * @param {*} value - The value to parse
 *
 * @returns {boolean|undefined} - The parsed boolean, or undefined if it cannot be parsed
 */
function parseBoolean ( value ) {
    if ( value == null ) {
        return undefined;
    }

    const normalized = String( value ).trim().toLowerCase();

    if ( [ 'true', '1', 'yes', 'on' ].includes( normalized ) ) {
        return true;
    }

    if ( [ 'false', '0', 'no', 'off' ].includes( normalized ) ) {
        return false;
    }

    return undefined;
}

/**
 * Parse a number from a string, returning undefined if it cannot be parsed
 * @param {*} value - The value to parse
 *
 * @returns {number|undefined} - The parsed number, or undefined if it cannot be parsed
 */
function parseNumber ( value ) {
    if ( value == null || value === '' ) {
        return undefined;
    }

    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : undefined;
}