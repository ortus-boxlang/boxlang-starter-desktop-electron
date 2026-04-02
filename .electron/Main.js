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
import { app, BrowserWindow, nativeImage, Menu, shell, dialog, Tray, globalShortcut } from "electron";
import { fileURLToPath } from 'url';

// Import our modular components
import { TrayMenu } from './TrayMenu.js';
import { AppMenu } from './AppMenu.js';
import { Shortcuts } from './Shortcuts.js';
import { BoxLang } from './BoxLang.js';

// Dynamic imports
const path = await import( "path" );
process.env.PATH = process.env.PATH + ":/usr/local/bin";

// Get the current file name
const thisFileName = fileURLToPath( import.meta.url );
// Get the name of the directory
const thisDirName = path.dirname( thisFileName );
// The path to the root of the project
const projectRoot = path.resolve( thisDirName, "../" );
// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Global Instances
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
const globalSettings = {
    // The internal server port
    serverPort: 59700,
    // Enable debug mode for the server — on by default in development only
    serverDebugMode: isDevelopment,
    // Window Defaults
    appName: "BoxLang Starter Desktop",
    windowHeight: 800,
    windowWidth: 1200,
    // Project paths
    projectRoot,
    path,
    // The loading view path
    loadingView: path.join( projectRoot, "views/loading.html" ),
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

const gotLock = app.requestSingleInstanceLock?.() ?? true;
if ( !gotLock ) {
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
  if (process.platform === 'darwin') {
    app.setAboutPanelOptions({
      applicationName: globalSettings.appName,
      applicationVersion: "1.0.0",
      copyright: "© 2025 Ortus Solutions, Corp"
    });
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

  boxLang.start();

  // Update component references after everything is created
  updateComponentReferences();
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
function handleQuit() {
    appIsQuitting = true;
    app.quit();
}

/**
 * Show or create window
 */
function showOrCreateWindow() {
    if ( mainWindow ) {
        mainWindow.show();
        mainWindow.focus();
    } else {
        createWindow();
    }
}

/**
 * Reload window
 */
function reloadWindow() {
    if ( mainWindow ) {
        mainWindow.reload();
    }
}

/**
 * Force reload window
 */
function forceReloadWindow() {
    if ( mainWindow ) {
        mainWindow.webContents.reloadIgnoringCache();
    }
}

/**
 * Close window
 */
function closeWindow() {
    mainWindow?.close();
}

/**
 * Toggle developer tools
 */
function toggleDevTools() {
    if ( mainWindow ) {
        mainWindow.webContents.toggleDevTools();
    }
}

/**
 * Update references in all components
 */
function updateComponentReferences() {
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
	dialog.showMessageBox( mainWindow, {
		type: 'info',
		title: 'About ' + globalSettings.appName,
		message: globalSettings.appName,
		detail: `Version: 1.0.0\n${globalSettings.appName}\nBuilt with Electron and Vite\n\nServer Port: ${globalSettings.serverPort}\nDebug Mode: ${globalSettings.serverDebugMode ? 'Enabled' : 'Disabled'}`,
		buttons: [ 'OK' ],
		icon: nativeImage.createFromPath( resolveAsset( 'includes', 'icon.iconset', 'icon_128x128.png' ) )
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
		? resolveAsset( 'includes', 'icon.ico' )
		: resolveAsset( 'includes', 'icon.iconset', 'icon_32x32.png' ),
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
			resolveAsset( 'includes', 'icon.iconset', 'icon_16x16.png' )
		);
		if ( !overlayIcon.isEmpty() ) {
			mainWindow.setOverlayIcon( overlayIcon, globalSettings.appName );
		}
	}

	// macOS-only: set the dock icon (must be .icns)
	if ( process.platform === 'darwin' && app?.dock ) {
		const dockIconIcns = resolveAsset( 'includes', 'icon.icns' );
		const dockIconPng = resolveAsset( 'includes', 'icon.iconset', 'icon_128x128.png' );

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
		if ( !isDevelopment ) {
			mainWindow.show();
		}
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
 *  Resolve the path to an asset
 *
 * @param  {...any} p Path parts to the asset
 *
 * @returns {string} The resolved path
 */
function resolveAsset ( ...p ) {
  return globalSettings.path.join( globalSettings.projectRoot, ...p );
}