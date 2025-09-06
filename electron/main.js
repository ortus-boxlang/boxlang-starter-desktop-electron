import { app, BrowserWindow, nativeImage } from "electron";
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

/**
 * ----------------------------------------------------------
 * Global Settings
 * --------------------------------------------------------
 *  You can change these settings to customize the app
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
  createWindow();
  startBoxLang();
} );

 // Graceful shutdown of BoxLang process
app.on( "before-quit", () => {
    appIsQuitting = true;
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
 * Create the main application window
 */
function createWindow () {
    mainWindow = new BrowserWindow( {
        width: windowWidth,
        height: windowHeight,
		title: windowTitle,
		// NOTE: icon is used on Windows/Linux. Prefer .ico on Windows, .png on Linux.
		icon: process.platform === 'win32'
		? resolveAsset( 'favicon.ico' )
		: resolveAsset( 'includes', 'icon.iconset', 'icon_32x32.png' ),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
        }
    } );

	// Window's only icon, requires a nativeImage
	const overlay = nativeImage.createFromPath( path.join( projectRoot, 'includes/icon.iconset/icon_32x32.png' ) );
	mainWindow.setOverlayIcon( overlay, windowTitle );

	// Windows-only: taskbar overlay icon (ideally 16x16 PNG)
	if ( process.platform === 'win32' ) {
		const overlay = nativeImage.createFromPath(
			resolveAsset( 'includes', 'overlay-16x16.png' )
		);
		if ( !overlay.isEmpty() ) {
			mainWindow.setOverlayIcon( overlay, windowTitle );
		}
	}

	// macOS-only: set the dock icon (must be .icns)
	if ( process.platform === 'darwin' && app?.dock ) {
		app.dock.setIcon( resolveAsset( 'includes', 'icon.icns' ) );
	}

	// Load the loading view first
    mainWindow.loadFile( loadingView );
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
			// BoxLang Configuration Path
            "--configPath",
            "config/boxlang.json"
		],
		// Spawn Options
		// See https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
		{
			cwd: projectRoot,
			detached: false,
			shell: false,
			windowsHide: true,
			signal: true,
			env: process.env
		}
	);

	boxLangProcess.stderr.on( "data", ( data ) => {
		console.error( `BoxLang Error: ${data}` );
	} );

	boxLangProcess.on( "close", ( code ) => {
		console.log( `BoxLang process exited with code ${code}` );
	} );

	boxLangProcess.stdout.on( 'data', checkServer );
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