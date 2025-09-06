import { app, BrowserWindow, nativeImage, Menu, shell, dialog, Tray, globalShortcut } from "electron";
import { spawn } from "child_process";
import { fileURLToPath } from 'url';

// Dynamic imports
const path = await import( "path" );
process.env.PATH = process.env.PATH + ":/usr/local/bin";

// Get the current file name
const thisFileName = fileURLToPath( import.meta.url );
// Get the name of the directory
const thisDirName = path.dirname( thisFileName );
// The path to the root of the project
const projectRoot = path.resolve( thisDirName, "../" );

// Global Variables
let boxLangProcess;
let mainWindow;
let tray;

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * ----------------------------------------------------------
 * Global Application Settings
 * --------------------------------------------------------
 *  You can change these settings to customize the app as you see fit.
 */
// The internal server port
const serverPort = 59777;
// Enable debug mode for the server (true/false)
const serverDebugMode = true;
// Window Defaults
const windowTitle = "BoxLang Application";
const windowHeight = 800;
const windowWidth = 1200;
// The loading view path
const loadingView =  path.join( projectRoot, "views/loading.html" );

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
process.on( 'SIGINT', () => { stopBoxLang(); app.quit(); } );
process.on( 'SIGTERM', () => { stopBoxLang(); app.quit(); } );

/**
 * Create the main application window once Electron is ready
 */
app.whenReady().then( () => {
  createAppMenu();
  createWindow();
  createTray();
  registerGlobalShortcuts();
  startBoxLang();
} );

 // Graceful shutdown of BoxLang process
app.on( "before-quit", () => {
    appIsQuitting = true;
    globalShortcut.unregisterAll();
	stopBoxLang(); // one place to stop the child
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
        if ( !boxLangProcess || boxLangProcess.killed ) {
            startBoxLang();
        }
    }
} );

//  if a second instance is launched, focus the existing window
app.on?.( 'second-instance', () => {
  const [ win ] = BrowserWindow.getAllWindows();
  if ( win ) { win.show(); win.focus(); }
} );

/**
 * -----------------------------------------------------------
 * HELPERS
 * -----------------------------------------------------------
 */

/**
 * Register global shortcuts
 */
function registerGlobalShortcuts () {
    // Quick show/hide application
    globalShortcut.register( 'CommandOrControl+Shift+L', () => {
        if ( mainWindow ) {
            if ( mainWindow.isVisible() && mainWindow.isFocused() ) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    } );

    // Quick restart BoxLang server
    globalShortcut.register( 'CommandOrControl+Shift+R', () => {
        restartBoxLang();
    } );

    // Open application in browser
    globalShortcut.register( 'CommandOrControl+Shift+O', () => {
        shell.openExternal( `http://localhost:${serverPort}` );
    } );
}

/**
 * Create the application menu
 */
function createAppMenu () {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        if ( mainWindow ) {
                            mainWindow.show();
                            mainWindow.focus();
                        } else {
                            createWindow();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if ( mainWindow ) {
                            mainWindow.reload();
                        }
                    }
                },
                {
                    label: 'Force Reload',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        if ( mainWindow ) {
                            mainWindow.webContents.reloadIgnoringCache();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Restart BoxLang Server',
                    accelerator: 'CmdOrCtrl+Shift+B',
                    click: () => restartBoxLang()
                },
                { type: 'separator' },
                {
                    label: process.platform === 'darwin' ? 'Close Window' : 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Ctrl+Q',
                    click: () => {
                        if ( process.platform === 'darwin' ) {
                            mainWindow?.close();
                        } else {
                            app.quit();
                        }
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        if ( mainWindow ) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                ...( process.platform === 'darwin' ? [
                    { role: 'close' },
                    { role: 'zoom' },
                    { type: 'separator' },
                    { role: 'front' }
                ] : [
                    { role: 'close' }
                ] )
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About BoxLang Application',
                    click: () => showAboutDialog()
                },
                {
                    label: 'BoxLang Documentation',
                    click: () => shell.openExternal( 'https://boxlang.ortussolutions.com' )
                },
                {
                    label: 'Report Issue',
                    click: () => shell.openExternal( 'https://github.com/ortus-boxlang/boxlang/issues' )
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate( template );
    Menu.setApplicationMenu( menu );
}

/**
 * Stop the BoxLang mini server
 *
 * @param {*} signal The signal to send (default: SIGTERM)
 */
function stopBoxLang ( signal = 'SIGTERM' ) {
  if (  boxLangProcess && !boxLangProcess.killed ) {
	try { boxLangProcess.kill( signal ); }
	catch {
		console.warn( "BoxLang process already killed." );
	}
  }
}

/**
 * Create system tray
 */
function createTray () {
    // Use a smaller icon for the tray (16x16 is typical)
    const trayIcon = nativeImage.createFromPath( resolveAsset( 'includes', 'icons', 'icon_16x16.png' ) );

    if ( trayIcon.isEmpty() ) {
        // Fallback if the specific tray icon doesn't exist
        return;
    }

    tray = new Tray( trayIcon );

    const contextMenu = Menu.buildFromTemplate( [
        {
            label: 'Show Application',
            click: () => {
                if ( mainWindow ) {
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createWindow();
                }
            }
        },
        {
            label: 'Hide Application',
            click: () => {
                if ( mainWindow ) {
                    mainWindow.hide();
                }
            }
        },
        { type: 'separator' },
        {
            label: `Server Status: ${boxLangProcess && !boxLangProcess.killed ? 'Running' : 'Stopped'}`,
            enabled: false
        },
        {
            label: 'Restart BoxLang Server',
            click: () => restartBoxLang()
        },
        { type: 'separator' },
        {
            label: 'Open in Browser',
            click: () => shell.openExternal( `http://localhost:${serverPort}` )
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                appIsQuitting = true;
                app.quit();
            }
        }
    ] );

    tray.setContextMenu( contextMenu );
    tray.setToolTip( `${windowTitle} - Port: ${serverPort}` );

    // Click to show/hide window
    tray.on( 'click', () => {
        if ( mainWindow ) {
            if ( mainWindow.isVisible() && mainWindow.isFocused() ) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    } );
}

/**
 * Update tray context menu with current server status
 */
function updateTrayMenu () {
    if ( !tray ) return;

    const contextMenu = tray.getContextMenu();
    if ( contextMenu && contextMenu.items[ 3 ] ) {
        contextMenu.items[ 3 ].label = `Server Status: ${boxLangProcess && !boxLangProcess.killed ? 'Running' : 'Stopped'}`;
    }
}

/**
 * Restart the BoxLang server
 */
function restartBoxLang () {
    console.log( "Restarting BoxLang server..." );
    stopBoxLang();
    updateTrayMenu();
    setTimeout( () => {
        startBoxLang();
    }, 2000 );
}

/**
 * Show about dialog
 */
function showAboutDialog () {
    dialog.showMessageBox( mainWindow, {
        type: 'info',
        title: 'About BoxLang Desktop Application',
        message: windowTitle,
        detail: `Version: 1.0.0\nBoxLang Desktop Application\nBuilt with Electron and Vite\n\nServer Port: ${serverPort}\nDebug Mode: ${serverDebugMode ? 'Enabled' : 'Disabled'}`,
        buttons: [ 'OK' ]
    } );
}

/**
 * Create the main application window
 */
function createWindow () {
    mainWindow = new BrowserWindow( {
        width: windowWidth,
        height: windowHeight,
		title: windowTitle,
		// Show window when ready in production, immediately in development
		show: isDevelopment,
		// NOTE: icon is used on Windows/Linux. Prefer .ico on Windows, .png on Linux.
		icon: process.platform === 'win32'
		? resolveAsset( 'favicon.ico' )
		: resolveAsset( 'includes', 'icons', 'icon_32x32.png' ),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
			// Enable dev tools in development
			devTools: isDevelopment
        }
    } );

	// Open dev tools automatically in development
	if ( isDevelopment ) {
		mainWindow.webContents.openDevTools();
	}

	// Window's only icon, requires a nativeImage
	const overlay = nativeImage.createFromPath( path.join( projectRoot, 'includes/icons/icon_32x32.png' ) );
	if ( !overlay.isEmpty() ) {
		mainWindow.setOverlayIcon( overlay, windowTitle );
	}

	// Windows-only: taskbar overlay icon (ideally 16x16 PNG)
	if ( process.platform === 'win32' ) {
		const overlayIcon = nativeImage.createFromPath(
			resolveAsset( 'includes', 'overlay-16x16.png' )
		);
		if ( !overlayIcon.isEmpty() ) {
			mainWindow.setOverlayIcon( overlayIcon, windowTitle );
		}
	}

	// macOS-only: set the dock icon (must be .icns)
	if ( process.platform === 'darwin' && app?.dock ) {
		const dockIcon = resolveAsset( 'includes', 'icons', 'icon.icns' );
		try {
			app.dock.setIcon( dockIcon );
		} catch ( error ) {
			console.warn( "Could not set dock icon:", error.message );
		}
	}

	// Load the loading view first
    mainWindow.loadFile( loadingView );

	// Show window when ready (for production)
	mainWindow.once( 'ready-to-show', () => {
		if ( !isDevelopment ) {
			mainWindow.show();
		}
	} );

	// Monitor close to hide on macOS
	mainWindow.on( 'close', ( e ) => {
		if ( !appIsQuitting && process.platform === 'darwin' ) {
			e.preventDefault();    // just hide window instead of quitting
			mainWindow.hide();
		}
	} );
}

/**
 * Startup the BoxLang mini server
 */
function startBoxLang () {
	console.log( "Starting BoxLang mini server..." );

	// Check if server is already running
	if ( boxLangProcess && !boxLangProcess.killed ) {
		console.log( "BoxLang server is already running" );
		return;
	}

	// Start up the boxlang mini server
	boxLangProcess = spawn(
		// Command
		"boxlang-miniserver",
		// Command Arguments
		[
			// Port
			"-p",
			serverPort.toString(),
			// If serverDebugMode = true, then add --debug, else nothing
			serverDebugMode ? "--debug" : "",
			// Enable Rewrites
			"--rewrites",
			// Bind locally only, this is a desktop app
			"--host",
			"127.0.0.1",
			// Webroot
			"-w",
			projectRoot,
			// BoxLang Custom Home
			"--serverHome",
			path.join( projectRoot, ".boxlang" )
		].filter( Boolean ), // Remove empty strings
		// Spawn Options
		// See https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
		{
			cwd: projectRoot,
			detached: false,
			shell: false,
			windowsHide: true,
			env: process.env
		}
	);

	boxLangProcess.stderr.on( "data", ( data ) => {
		console.error( `BoxLang Error: ${data}` );
		// Show error notification
		if ( mainWindow && !mainWindow.isDestroyed() ) {
			mainWindow.webContents.executeJavaScript(
				`console.error('BoxLang Server Error: ${data.toString().replace( /'/g, "\\'" )}')`
			);
		}
	} );

	boxLangProcess.on( "close", ( code ) => {
		console.log( `BoxLang process exited with code ${code}` );
		updateTrayMenu();

		// Auto-restart on unexpected exit (not during app shutdown)
		if ( !appIsQuitting && code !== 0 ) {
			console.log( "BoxLang server crashed, attempting restart in 5 seconds..." );
			setTimeout( () => {
				if ( !appIsQuitting ) {
					startBoxLang();
				}
			}, 5000 );
		}
	} );

	boxLangProcess.on( "error", ( error ) => {
		console.error( "Failed to start BoxLang server:", error );

		// Show error dialog
		dialog.showErrorBox(
			"Server Startup Error",
			`Failed to start BoxLang server: ${error.message}\n\nPlease ensure BoxLang MiniServer is installed and in your PATH.`
		);
	} );

	boxLangProcess.stdout.on( 'data', checkServer );

	// Update tray status
	setTimeout( () => updateTrayMenu(), 1000 );
}

/**
 * Check the status of the BoxLang server
 *
 * @param {*} message The message from the server
 */
function checkServer ( message ) {
    if ( message.toString().includes( "BoxLang MiniServer started" ) ) {
        let loadPage = () => {
            mainWindow.loadURL( "http://localhost:" + serverPort + "/" );
        }
        setTimeout( () => {
            loadPage();
        }, 1000 );
        mainWindow.webContents.on( "did-finish-load", () => {
            console.log( "Page loaded successfully." );
        } );
        mainWindow.webContents.on( "did-fail-load", () => {
            setTimeout( () => {
                loadPage();
                console.log( "Retrying to load the page..." );
            }, 1000 );
        } );

        boxLangProcess.stdout.removeListener( "data", checkServer );
    }
}

/**
 *  Resolve the path to an asset
 *
 * @param  {...any} p Path parts to the asset
 *
 * @returns {string} The resolved path
 */
function resolveAsset ( ...p ) {
  return path.join( projectRoot, ...p );
}