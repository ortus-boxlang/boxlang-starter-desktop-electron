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
import { spawn, spawnSync } from "child_process";
import { dialog, Notification, app } from "electron";
import { existsSync, chmodSync, accessSync, constants as fsConstants } from "fs";
import { createServer } from "net";
const path = await import( "path" );

// Centralized configuration for timeouts and intervals
const STARTUP_TIMEOUT_MS = 60000;
const READINESS_RETRY_INTERVAL_MS = 500;
const JAVA_CHECK_VISIBILITY_DELAY_MS = 1500;

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
        this.startSequence = 0;
        this.startPromise = null;

        // References that will be set later
        this.mainWindow = null;

        // Prefer the embedded JRE (runtime/jre/) over the system Java install.
        // Done before detectMiniServerCommand() so child processes spawned later
        // (MiniServer, terminal panel, REPL, etc.) all inherit JAVA_HOME.
        this.applyEmbeddedJavaHome();

        // Determine the miniserver command to use
        this.miniserverCommand = this.detectMiniServerCommand();
    }

    /**
     * Resolve the path to an embedded JRE at runtime/jre/, if one exists.
     *
     * @returns {string|null} Absolute path to the embedded JAVA_HOME, or null.
     */
    detectEmbeddedJavaHome () {
        const { projectRoot } = this.globalSettings;
        const embeddedHome = path.join( projectRoot, 'runtime', 'jre' );
        const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';
        const javaPath = path.join( embeddedHome, 'bin', javaExecutable );
        return existsSync( javaPath ) ? embeddedHome : null;
    }

    /**
     * When an embedded JRE is present and the user has not overridden
     * JAVA_HOME explicitly, point JAVA_HOME + PATH at the embedded runtime
     * so every subsequent spawn (and the launcher scripts under runtime/bin)
     * picks it up automatically.
     */
    applyEmbeddedJavaHome () {
        const embeddedHome = this.detectEmbeddedJavaHome();
        if ( !embeddedHome ) {
            return;
        }

        const forceEmbeddedJava = app?.isPackaged && process.env.BOXLANG_ADMIN_ALLOW_SYSTEM_JAVA !== '1';

        if ( forceEmbeddedJava ) {
            const previousJavaHome = process.env.JAVA_HOME;
            process.env.JAVA_HOME = embeddedHome;
            process.env.PATH = path.join( embeddedHome, 'bin' ) + path.delimiter + ( process.env.PATH || '' );

            if ( previousJavaHome && previousJavaHome !== embeddedHome ) {
                console.log( `✅ Using embedded JRE: ${embeddedHome} (overriding JAVA_HOME=${previousJavaHome} in packaged mode)` );
            } else {
                console.log( `✅ Using embedded JRE: ${embeddedHome}` );
            }
            return;
        }

        if ( process.env.JAVA_HOME ) {
            console.log( `ℹ️  Embedded JRE available at ${embeddedHome}, but JAVA_HOME=${process.env.JAVA_HOME} is already set — honoring user override.` );
            return;
        }

        process.env.JAVA_HOME = embeddedHome;
        process.env.PATH = path.join( embeddedHome, 'bin' ) + path.delimiter + ( process.env.PATH || '' );
        console.log( `✅ Using embedded JRE: ${embeddedHome}` );
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
	 * Show a startup error on the loading screen renderer.
	 *
      * @param {string} title
      * @param {string} message
      * @param {string} [linkText]
      * @param {string} [linkUrl]
      */
    showLoadingError ( title, message, linkText = '', linkUrl = '' ) {
        const mainWindow = this.getSafeWindow();

        if ( !mainWindow ) {
            return;
        }

        const serializedTitle = JSON.stringify( String( title || '' ) );
        const serializedMessage = JSON.stringify( String( message || '' ) );
        const serializedLinkText = JSON.stringify( String( linkText || '' ) );
        const serializedLinkUrl = JSON.stringify( String( linkUrl || '' ) );

        mainWindow.webContents
            .executeJavaScript(
                `window.showLoadingError?.(${serializedTitle}, ${serializedMessage}, ${serializedLinkText}, ${serializedLinkUrl});`,
                true
            )
            .catch( ( error ) => {
                console.warn( 'Could not render loading error in renderer:', error.message );
            } );
    }

    /**
	 * Show the Java preflight status text on the loading screen.
	 *
	 * @param {string} message
	 */
    showJavaCheckStatus ( message = 'Checking For Java...' ) {
        const mainWindow = this.getSafeWindow();

        if ( !mainWindow ) {
            return;
        }

        const serializedMessage = JSON.stringify( String( message ) );
        mainWindow.webContents
            .executeJavaScript( `window.setJavaCheckStatus?.(${serializedMessage});`, true )
            .catch( ( error ) => {
                console.warn( 'Could not render Java check status in renderer:', error.message );
            } );
    }

    /**
	 * Hide the Java preflight status text on the loading screen.
	 */
    clearJavaCheckStatus () {
        const mainWindow = this.getSafeWindow();

        if ( !mainWindow ) {
            return;
        }

        mainWindow.webContents
            .executeJavaScript( 'window.clearJavaCheckStatus?.();', true )
            .catch( ( error ) => {
                console.warn( 'Could not clear Java check status in renderer:', error.message );
            } );
    }

    /**
	 * Check whether Java is available via JAVA_HOME or PATH.
	 *
	 * @returns {boolean}
	 */
    checkJavaAvailable () {
        const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';
        const javaHome = process.env.JAVA_HOME;

        if ( javaHome ) {
            const javaFromHome = path.join( javaHome, 'bin', javaExecutable );
            if ( existsSync( javaFromHome ) ) {
                return true;
            }
        }

        try {
            if ( process.platform === 'darwin' ) {
                const javaHomeResult = spawnSync( '/usr/libexec/java_home', [], { timeout: 3000 } );
                if ( javaHomeResult.status === 0 ) {
                    return true;
                }
            }

            if ( process.platform === 'win32' ) {
                const whereResult = spawnSync( 'where', [ 'java' ], { timeout: 3000, shell: true } );
                if ( whereResult.status === 0 ) {
                    return true;
                }
            } else {
                const whichResult = spawnSync( 'which', [ 'java' ], { timeout: 3000 } );
                if ( whichResult.status === 0 ) {
                    return true;
                }
            }
        } catch ( error ) {
            console.warn( `Java availability check failed: ${error.message}` );
        }

        return false;
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
     * Ensure the packaged miniserver command is executable on Unix-like systems.
     * This self-heals older downloads that were extracted without +x permissions.
     */
    ensurePackagedCommandExecutable () {
        if ( this.miniserverCommand.type !== 'packaged' || process.platform === 'win32' ) {
            return;
        }

        try {
            accessSync( this.miniserverCommand.command, fsConstants.X_OK );
        } catch ( error ) {
            try {
                chmodSync( this.miniserverCommand.command, 0o755 );
                console.log( `✅ Restored execute permission on packaged miniserver: ${this.miniserverCommand.command}` );
            } catch ( chmodError ) {
                console.warn( `⚠️  Could not set execute permission on packaged miniserver: ${chmodError.message}` );
            }
        }
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
    async start () {
        if ( this.state === 'starting' || this.state === 'running' ) {
            console.log( `BoxLang server is already ${this.state}` );
            return this.startPromise;
        }

        this.showJavaCheckStatus( 'Checking For Java...' );
        await delay( JAVA_CHECK_VISIBILITY_DELAY_MS );

        if ( !this.checkJavaAvailable() ) {
            this.process = null;
            this.startPromise = null;
            this.state = 'stopped';
            this.setProgressBar( -1 );
            this.setDockBadge( '' );

            const errorMessage = 'Java was not found on this system. BoxLang MiniServer requires Java 21. Please install Java 21 and relaunch BoxLang Admin.';
            this.showLoadingError(
                'Java 21 Required',
                errorMessage,
                'Download Java 21',
                'https://adoptium.net/temurin/releases/?version=21'
            );
            this.logRendererError( errorMessage );
            return null;
        }

        this.clearJavaCheckStatus();

        // Probe for an available port before starting the server.
        // If the preferred port is in use, find a random available one.
        const resolvedPort = await this.findAvailablePort( this.globalSettings.serverPort );
        // Update globalSettings so the rest of the app uses the resolved port
        this.globalSettings.serverPort = resolvedPort;
        this.globalSettings.serverOrigin = `http://localhost:${resolvedPort}`;

        console.log( "Starting BoxLang mini server..." );
        console.log( `Using ${this.miniserverCommand.type} miniserver: ${this.miniserverCommand.command}` );

        this.ensurePackagedCommandExecutable();

        const miniserverArgs = [
            "--serverHome",
            path.join( this.globalSettings.appHome, "home" ),
            this.globalSettings.serverDebugMode ? "--debug" : "",
            path.join( this.globalSettings.projectRoot, "miniserver.json" )
        ].filter( Boolean );

        this.state = 'starting';
        this.startSequence += 1;
        const startSequence = this.startSequence;

        // Show indeterminate progress bar while server is starting
        this.setProgressBar( 2 );
        this.setDockBadge( '…' );

        // Prepare spawn options
        const spawnOptions = {
            cwd: this.globalSettings.projectRoot,
            detached: false,
            // .bat files on Windows require shell:true — spawning them directly causes EINVAL
            shell: process.platform === 'win32',
            windowsHide: true,
            env: {
                ...process.env,
                BOXLANG_HOME: this.globalSettings.appHome,
				BOXLANG_PORT: this.globalSettings.serverPort
            }
        };

        // On macOS, explicitly set JAVA_HOME if not already present
        // (Electron apps don't inherit shell environment variables)
        if ( process.platform === 'darwin' && !spawnOptions.env.JAVA_HOME ) {
            try {
                const javaHomeResult = spawnSync( '/usr/libexec/java_home', [], { timeout: 3000 } );
                if ( javaHomeResult.status === 0 ) {
                    spawnOptions.env.JAVA_HOME = javaHomeResult.stdout.toString().trim();
                    console.log( `✅ Set JAVA_HOME from java_home: ${spawnOptions.env.JAVA_HOME}` );
                }
            } catch ( error ) {
                console.warn( `Could not detect JAVA_HOME: ${error.message}` );
            }
        }

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

        let spawnCommand = this.miniserverCommand.command;
        let spawnArgs = miniserverArgs;

        // Some Linux installs can land packaged files without +x and app binaries
        // under /usr/lib are not writable for post-install chmod fixes.
        // In that case, run the launcher script through /bin/sh.
        if ( this.miniserverCommand.type === 'packaged' && process.platform !== 'win32' ) {
            try {
                accessSync( this.miniserverCommand.command, fsConstants.X_OK );
            } catch {
                spawnCommand = '/bin/sh';
                spawnArgs = [ this.miniserverCommand.command, ...miniserverArgs ];
                console.warn( `⚠️  Packaged miniserver is not executable, launching via /bin/sh fallback: ${this.miniserverCommand.command}` );
            }
        }

        // Start up the BoxLang mini server.
        this.process = spawn( spawnCommand, spawnArgs, spawnOptions );

        // Handle stderr
        this.process.stderr.on( "data", ( data ) => {
            console.error( `BoxLang Error: ${data}` );
            this.logRendererError( `BoxLang Server Error: ${data.toString()}` );
        } );

        this.process.stdout.on( 'data', ( data ) => {
            console.log( `BoxLang: ${data.toString().trim()}` );
        } );

        // Handle process close
        this.process.on( "close", ( code, signal ) => {
            console.log( `BoxLang process exited with code ${code}${signal ? ` (signal ${signal})` : ''}` );
            const previousState = this.state;
            const exitedDuringStartup = previousState === 'starting';
            const crashedAfterRunning = previousState === 'running' && Number.isInteger( code ) && code !== 0;

            this.process = null;
            this.startPromise = null;
            this.state = this.isQuitting ? 'stopped' : 'stopped';

            // Clear progress bar and dock badge on exit
            this.setProgressBar( -1 );
            this.setDockBadge( '' );

            if ( !this.isQuitting && exitedDuringStartup ) {
                this.notify(
                    'BoxLang Server Failed To Start',
                    `Server exited during startup${Number.isInteger( code ) ? ` (code ${code})` : ''}.`
                );
                this.requestAttention( 'critical' );
            }

            // Crashing is handled by notifying the user and letting them restart the app.
            if ( !this.isQuitting && crashedAfterRunning ) {
                this.notify(
                    'BoxLang Server Crashed',
                    `Server stopped unexpectedly (code ${code}). Please restart the application.`
                );
                this.requestAttention( 'critical' );
            }
        } );

        // Handle process error
        this.process.on( "error", ( error ) => {
            console.error( "Failed to start BoxLang server:", error );
            this.state = 'stopped';
            this.startPromise = null;
            this.process = null;
            this.setProgressBar( -1 );
            this.setDockBadge( '' );

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
        if ( this.process && !this.process.killed ) {
            this.state = 'stopping';
            try {
                this.process.kill( signal );
            } catch {
                console.warn( "BoxLang process already killed." );
                this.process = null;
                this.state = 'stopped';
            }
        } else {
            this.process = null;
            this.state = 'stopped';
        }
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

        this.stop();
        dialog.showErrorBox(
            'Server Startup Timeout',
            `BoxLang Admin did not become reachable within ${STARTUP_TIMEOUT_MS / 1000} seconds.\n\nChecked URL: ${serverUrl}\n\nVerify miniserver.json and try restarting the app.`
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
        this.notify(
            'BoxLang Admin Started'
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

    /**
     * Check if a port is available by attempting to bind to it.
     * @param {number} port - The port to check
     * @param {string} host - The host to bind to (default: '127.0.0.1')
     * @returns {Promise<boolean>} True if port is available
     */
    isPortAvailable ( port, host = '127.0.0.1' ) {
        return new Promise( ( resolve ) => {
            const server = createServer();
            server.once( 'error', () => resolve( false ) );
            server.once( 'listening', () => {
                server.close( () => resolve( true ) );
            } );
            server.listen( port, host );
        } );
    }

    /**
     * Find an available port, starting with the preferred port.
     * If the preferred port is unavailable, try random ports in the range 49152-65535.
     * @param {number} preferredPort - The preferred port to try first
     * @param {number} maxAttempts - Maximum number of random port attempts (default: 10)
     * @returns {Promise<number>} An available port number
     */
    async findAvailablePort ( preferredPort, maxAttempts = 10 ) {
        // Try preferred port first
        if ( await this.isPortAvailable( preferredPort ) ) {
            return preferredPort;
        }

        // Try random ports in the ephemeral range
        for ( let i = 0; i < maxAttempts; i++ ) {
            const randomPort = Math.floor( Math.random() * ( 65535 - 49152 + 1 ) ) + 49152;
            if ( await this.isPortAvailable( randomPort ) ) {
                return randomPort;
            }
        }

        throw new Error( `Could not find an available port after ${maxAttempts} attempts` );
    }
}
