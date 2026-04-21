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
import { spawn } from "child_process";
import { dialog, Notification, app } from "electron";
import { existsSync } from "fs";
const path = await import( "path" );

// Centralized configuration for timeouts and intervals
const STARTUP_TIMEOUT_MS = 30000;
const READINESS_RETRY_INTERVAL_MS = 500;
const RESTART_DELAY_MS = 5000;
const MANUAL_RESTART_DELAY_MS = 1000;

/**
 * Utility function to create a delay
 *
 * @param {*} timeout - Time in milliseconds to delay
 *
 * @returns {Promise} Promise that resolves after the specified timeout
 */
function delay ( timeout ) {
    return new Promise( ( resolve ) => {
        setTimeout( resolve, timeout );
    } );
}

/**
 * BoxLang Server Management Module
 * Handles starting, stopping, and monitoring the BoxLang miniserver process
 */
export class BoxLang {
    constructor ( globalSettings ) {
        this.globalSettings = globalSettings;
        this.process = null;
        this.isQuitting = false;
        this.state = 'stopped';
        this.restartTimer = null;
        this.startSequence = 0;
        this.startPromise = null;
        this.restartRequested = false;
        this.blockAutoRestart = false;

        // References that will be set later
        this.mainWindow = null;
        this.updateCallback = null;

        // Determine the miniserver command to use
        this.miniserverCommand = this.detectMiniServerCommand();
    }

    /**
     * Send a desktop notification
	 *
     * @param {string} title
     * @param {string} body
     */
    notify ( title, body ) {
        if ( Notification.isSupported() ) {
            new Notification( { title, body } ).show();
        }
    }

    /**
     * Set the macOS dock badge text. Pass empty string to clear it.
	 *
     * @param {string} text
     */
    setDockBadge ( text ) {
        if ( process.platform === 'darwin' && app?.dock ) {
            app.dock.setBadge( text );
        }
    }

    /**
     * Set taskbar progress bar. Pass -1 to remove, 2 for indeterminate (pulsing).
	 *
     * @param {number} value
     */
    setProgressBar ( value ) {
        if ( this.mainWindow && !this.mainWindow.isDestroyed() ) {
            this.mainWindow.setProgressBar( value );
        }
    }

    /**
     * Draw user attention: flash taskbar (Windows/Linux) or bounce dock (macOS).
	 *
     * @param {'critical'|'informational'} type  macOS bounce type (ignored on other platforms)
     */
    requestAttention ( type = 'critical' ) {
        if ( process.platform === 'darwin' && app?.dock ) {
            app.dock.bounce( type );
        } else if ( this.mainWindow && !this.mainWindow.isDestroyed() ) {
            this.mainWindow.flashFrame( true );
        }
    }

	/**
     * Set external references
	 *
     * @param {Object} refs - Object containing mainWindow and other references
     */
    setReferences ( refs ) {
        this.mainWindow = refs.mainWindow;
        this.updateCallback = refs.updateCallback;
    }

	/**
	 * Call the update callback to notify about status changes
	 */
    updateStatus () {
        if ( this.updateCallback ) {
            this.updateCallback();
        }
    }

	/**
	 * Get the server URL based on global settings
	 *
	 * @returns {string} Server URL
	 */
    getServerUrl () {
        return `${this.globalSettings.serverOrigin}/`;
    }

	/**
	 * Clear any pending restart timers
	 */
    clearRestartTimer () {
        if ( this.restartTimer ) {
            clearTimeout( this.restartTimer );
            this.restartTimer = null;
        }
    }

	/**
	 * Safely get the main window reference
	 *
	 * @returns {BrowserWindow|null} The main window or null if it's not available
	 */
    getSafeWindow () {
        if ( this.mainWindow && !this.mainWindow.isDestroyed() ) {
            return this.mainWindow;
        }

        return null;
    }

	/**
	 * Log an error message to the renderer console
	 *
	 * @param {string} message - The error message to log
	 */

    logRendererError ( message ) {
        const mainWindow = this.getSafeWindow();

        if ( !mainWindow ) {
            return;
        }

        const serializedMessage = JSON.stringify( String( message ) );
        mainWindow.webContents
            .executeJavaScript( `console.error(${serializedMessage});`, true )
            .catch( ( error ) => {
                console.warn( 'Could not write BoxLang error to renderer console:', error.message );
            } );
    }

    /**
     * Set quitting state
	 *
     * @param {boolean} quitting - Whether the app is quitting
     */
    setQuitting ( quitting ) {
        this.isQuitting = quitting;
    }

    /**
     * Detect which miniserver command to use
	 *
     * @returns {Object} Command info with path and type
     */
    detectMiniServerCommand () {
        const { projectRoot, path } = this.globalSettings;

        // Check for packaged miniserver first
        const packagedBinPath = path.join( projectRoot, 'runtime', 'bin' );
        const packagedCommand = process.platform === 'win32'
            ? path.join( packagedBinPath, 'boxlang-miniserver.bat' )
            : path.join( packagedBinPath, 'boxlang-miniserver' );

        if ( existsSync( packagedCommand ) ) {
            console.log( `✅ Using packaged BoxLang MiniServer: ${packagedCommand}` );
            return {
                command: packagedCommand,
                type: 'packaged',
                path: packagedBinPath
            };
        }

        // Fallback to global installation
        console.log( `⚠️  No packaged miniserver found, using global 'boxlang-miniserver' command` );
        console.log( `⚠️  To package miniserver, run: boxlang runtime/Package.bx` );
        return {
            command: 'boxlang-miniserver',
            type: 'global',
            path: null
        };
    }

    /**
     * Get the current process
	 *
     * @returns {ChildProcess|null} The BoxLang process
     */
    getProcess () {
        return this.process;
    }

    /**
     * Check if the server is running
	 *
     * @returns {boolean} True if running
     */
    isRunning () {
        return [ 'starting', 'running' ].includes( this.state ) && this.process && !this.process.killed;
    }

    /**
     * Start the BoxLang miniserver
     */
    start () {
        if ( this.state === 'starting' || this.state === 'running' ) {
            console.log( `BoxLang server is already ${this.state}` );
            return this.startPromise;
        }

        console.log( "Starting BoxLang mini server..." );
        console.log( `Using ${this.miniserverCommand.type} miniserver: ${this.miniserverCommand.command}` );

        this.clearRestartTimer();
        this.blockAutoRestart = false;
        this.restartRequested = false;
        this.state = 'starting';
        this.startSequence += 1;
        const startSequence = this.startSequence;
        this.updateStatus();

        // Show indeterminate progress bar while server is starting
        this.setProgressBar( 2 );
        this.setDockBadge( '…' );

        // Prepare spawn options
        const spawnOptions = {
            cwd: this.globalSettings.projectRoot,
            detached: false,
            shell: false,
            windowsHide: true,
            env: {
                ...process.env,
                BOXLANG_HOME: this.globalSettings.appHome
            }
        };

        // For packaged miniserver, we need to set up the environment
        if ( this.miniserverCommand.type === 'packaged' ) {
            const libPath = path.join( this.globalSettings.projectRoot, 'runtime', 'lib' );

            // Add lib directory to classpath/library path
            if ( process.platform === 'win32' ) {
                spawnOptions.env.PATH = `${this.miniserverCommand.path};${spawnOptions.env.PATH || ''}`;
            } else {
                spawnOptions.env.PATH = `${this.miniserverCommand.path}:${spawnOptions.env.PATH || ''}`;
                // For Unix systems, also set library path
                spawnOptions.env.LD_LIBRARY_PATH = `${libPath}:${spawnOptions.env.LD_LIBRARY_PATH || ''}`;
                spawnOptions.env.DYLD_LIBRARY_PATH = `${libPath}:${spawnOptions.env.DYLD_LIBRARY_PATH || ''}`;
            }
        }

        // Start up the boxlang mini server
        this.process = spawn(
            // Command
            this.miniserverCommand.command,
            // Pass miniserver.json as the config file — the server reads all settings from it.
            // Only --debug is passed as a CLI override when running in development mode,
            // since miniserver.json ships with debug:false.
            [
                "miniserver.json",
                this.globalSettings.serverDebugMode ? "--debug" : ""
            ].filter( Boolean ),
            // Spawn Options
            spawnOptions
        );

        // Handle stderr
        this.process.stderr.on( "data", ( data ) => {
            console.error( `BoxLang Error: ${data}` );
            this.logRendererError( `BoxLang Server Error: ${data.toString()}` );
        } );

        this.process.stdout.on( 'data', ( data ) => {
            console.log( `BoxLang: ${data.toString().trim()}` );
        } );

        // Handle process close
        this.process.on( "close", ( code ) => {
            console.log( `BoxLang process exited with code ${code}` );
            const wasRestartRequested = this.restartRequested;

            this.process = null;
            this.startPromise = null;
            this.state = this.isQuitting ? 'stopped' : 'stopped';

            // Clear progress bar and dock badge on exit
            this.setProgressBar( -1 );
            this.setDockBadge( '' );

            // Notify about status change
            this.updateStatus();

            // Auto-restart on unexpected exit (not during app shutdown)
            if ( !this.isQuitting && !wasRestartRequested && !this.blockAutoRestart && code !== 0 ) {
                console.log( "BoxLang server crashed, attempting restart in 5 seconds..." );
                this.notify(
                    'BoxLang Server Crashed',
                    `Server stopped unexpectedly (code ${code}). Restarting in 5 seconds…`
                );
                this.requestAttention( 'critical' );
                this.restartTimer = setTimeout( () => {
                    if ( !this.isQuitting ) {
                        this.start();
                    }
                }, RESTART_DELAY_MS );
            }
        } );

        // Handle process error
        this.process.on( "error", ( error ) => {
            console.error( "Failed to start BoxLang server:", error );
            this.blockAutoRestart = true;
            this.state = 'stopped';
            this.startPromise = null;
            this.process = null;
            this.setProgressBar( -1 );
            this.setDockBadge( '' );
            this.updateStatus();

            let errorMessage = `Failed to start BoxLang server: ${error.message}\n\n`;

            if ( this.miniserverCommand.type === 'global' ) {
                errorMessage += `Using global BoxLang MiniServer command: ${this.miniserverCommand.command}\n\n`;
                errorMessage += `Solutions:\n`;
                errorMessage += `1. Install BoxLang globally or ensure it's in your PATH\n`;
                errorMessage += `2. Package miniserver locally by running: boxlang runtime/Package.bx\n`;
                errorMessage += `3. Or download manually and run the packager`;
            } else {
                errorMessage += `Using packaged BoxLang MiniServer: ${this.miniserverCommand.command}\n\n`;
                errorMessage += `The packaged miniserver may be corrupted. Try:\n`;
                errorMessage += `1. Re-run: boxlang runtime/Package.bx --force\n`;
                errorMessage += `2. Check file permissions on the executable`;
            }

            // Show error dialog
            dialog.showErrorBox(
                "Server Startup Error",
                errorMessage
            );
        } );

        this.startPromise = this.waitForServerReady( startSequence );
        return this.startPromise;
    }

    /**
     * Stop the BoxLang miniserver
     * @param {string} signal - The signal to send (default: SIGTERM)
     */
    stop ( signal = 'SIGTERM' ) {
        this.clearRestartTimer();

        if ( this.process && !this.process.killed ) {
            this.state = 'stopping';
            this.updateStatus();
            try {
                this.process.kill( signal );
            } catch {
                console.warn( "BoxLang process already killed." );
                this.process = null;
                this.state = 'stopped';
                this.updateStatus();
            }
        } else {
            this.process = null;
            this.state = 'stopped';
            this.updateStatus();
        }
    }

    /**
     * Restart the BoxLang server
     */
    restart () {
        console.log( "Restarting BoxLang server..." );
        this.notify( 'BoxLang Server', 'Restarting server…' );
        this.restartRequested = true;
        this.clearRestartTimer();
        this.stop();

        this.restartTimer = setTimeout( () => {
            this.restartRequested = false;
            this.start();
        }, MANUAL_RESTART_DELAY_MS );
    }

    /**
     * Wait until the server is reachable over HTTP before loading the app.
     * @param {number} startSequence - The current startup sequence number
     */
    async waitForServerReady ( startSequence ) {
        const serverUrl = this.getServerUrl();
        const deadline = Date.now() + STARTUP_TIMEOUT_MS;

        while ( Date.now() < deadline ) {
            if ( this.startSequence !== startSequence || this.isQuitting ) {
                return;
            }

            if ( !this.process || this.process.killed ) {
                return;
            }

            try {
                const response = await fetch( serverUrl, {
                    method: 'GET',
                    redirect: 'manual',
                    signal: AbortSignal.timeout( 2000 )
                } );

                if ( response.ok || [ 301, 302, 304, 401, 403 ].includes( response.status ) ) {
                    this.handleServerReady();
                    return;
                }
            } catch {
                // The server is still starting.
            }

            await delay( READINESS_RETRY_INTERVAL_MS );
        }

        this.blockAutoRestart = true;
        this.stop();
        dialog.showErrorBox(
            'Server Startup Timeout',
            `BoxLang MiniServer did not become reachable within ${STARTUP_TIMEOUT_MS / 1000} seconds.\n\nChecked URL: ${serverUrl}\nConfig: ${this.globalSettings.serverConfig.configPath}\n\nVerify miniserver.json and try restarting the app.`
        );
    }

    handleServerReady () {
        const serverPort = this.globalSettings.serverPort;
        const mainWindow = this.getSafeWindow();

        if ( this.state === 'running' ) {
            return;
        }

        this.state = 'running';
        this.setProgressBar( -1 );
        this.setDockBadge( '' );
        this.startPromise = null;
        this.updateStatus();
        this.notify(
            'BoxLang Server Started',
            `Server is running on port ${serverPort}`
        );

        if ( mainWindow ) {
            mainWindow.loadURL( this.getServerUrl() );
            mainWindow.webContents.once( 'did-finish-load', () => {
                console.log( 'Page loaded successfully.' );
            } );
        }
    }

    /**
     * Get server status text
     * @returns {string} Status text
     */
    getStatus () {
        if ( this.state === 'starting' ) {
            return 'Starting';
        }

        if ( this.state === 'stopping' ) {
            return 'Stopping';
        }

        return this.isRunning() ? 'Running' : 'Stopped';
    }

    /**
     * Get miniserver information
     * @returns {Object} Miniserver info
     */
    getMiniServerInfo () {
        return {
            command: this.miniserverCommand.command,
            type: this.miniserverCommand.type,
            isPackaged: this.miniserverCommand.type === 'packaged',
            path: this.miniserverCommand.path
        };
    }

    /**
     * Check if packaged miniserver is available
     * @returns {boolean} True if packaged miniserver exists
     */
    hasPackagedMiniServer () {
        const { projectRoot, path } = this.globalSettings;
        const packagedCommand = process.platform === 'win32'
            ? path.join( projectRoot, 'runtime', 'bin', 'boxlang-miniserver.bat' )
            : path.join( projectRoot, 'runtime', 'bin', 'boxlang-miniserver' );
        return existsSync( packagedCommand );
    }
}
