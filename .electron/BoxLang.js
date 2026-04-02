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
import { existsSync, readFileSync } from "fs";

/**
 * BoxLang Server Management Module
 * Handles starting, stopping, and monitoring the BoxLang miniserver process
 */
export class BoxLang {
    constructor( globalSettings ) {
        this.globalSettings = globalSettings;
        this.process = null;
        this.isQuitting = false;

        // References that will be set later
        this.mainWindow = null;
        this.updateCallback = null;

        // Load miniserver configuration from miniserver.json
        this.miniserverConfig = this.loadMiniserverConfig();

        // Determine the miniserver command to use
        this.miniserverCommand = this.detectMiniServerCommand();
    }


    /**
     * Send a desktop notification
     * @param {string} title
     * @param {string} body
     */
    notify( title, body ) {
        if ( Notification.isSupported() ) {
            new Notification( { title, body } ).show();
        }
    }

    /**
     * Set the macOS dock badge text. Pass empty string to clear it.
     * @param {string} text
     */
    setDockBadge( text ) {
        if ( process.platform === 'darwin' && app?.dock ) {
            app.dock.setBadge( text );
        }
    }

    /**
     * Set taskbar progress bar. Pass -1 to remove, 2 for indeterminate (pulsing).
     * @param {number} value
     */
    setProgressBar( value ) {
        if ( this.mainWindow && !this.mainWindow.isDestroyed() ) {
            this.mainWindow.setProgressBar( value );
        }
    }

    /**
     * Draw user attention: flash taskbar (Windows/Linux) or bounce dock (macOS).
     * @param {'critical'|'informational'} type  macOS bounce type (ignored on other platforms)
     */
    requestAttention( type = 'critical' ) {
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
    setReferences( refs ) {
        this.mainWindow = refs.mainWindow;
        this.updateCallback = refs.updateCallback;
    }

    /**
     * Set quitting state
     * @param {boolean} quitting - Whether the app is quitting
     */
    setQuitting( quitting ) {
        this.isQuitting = quitting;
    }

    /**
     * Load miniserver configuration from miniserver.json
     * Falls back to sensible defaults if the file cannot be read.
     * @returns {Object} Parsed miniserver configuration
     */
    loadMiniserverConfig() {
        const { projectRoot, path } = this.globalSettings;
        const configPath = path.join( projectRoot, 'miniserver.json' );
        try {
            // Strip single-line (//) and block (/* */) comments before parsing
            const raw = readFileSync( configPath, 'utf8' );
            const stripped = raw
                .replace( /\/\*[\s\S]*?\*\//g, '' )  // block comments
                .replace( /\/\/.*$/gm, '' );           // single-line comments
            return JSON.parse( stripped );
        } catch ( error ) {
            console.warn( `⚠️  Could not read miniserver.json (${error.message}), using defaults` );
            return {};
        }
    }

    /**
     * Detect which miniserver command to use
     * @returns {Object} Command info with path and type
     */
    detectMiniServerCommand() {
        const { projectRoot, path } = this.globalSettings;

        // Check for packaged miniserver first
        const packagedBinPath = path.join( projectRoot, '.miniserver', 'bin' );
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
        console.log( `   To package miniserver, run: boxlang .miniserver/Package.bx` );
        return {
            command: 'boxlang-miniserver',
            type: 'global',
            path: null
        };
    }

    /**
     * Get the current process
     * @returns {ChildProcess|null} The BoxLang process
     */
    getProcess() {
        return this.process;
    }

    /**
     * Check if the server is running
     * @returns {boolean} True if running
     */
    isRunning() {
        return this.process && !this.process.killed;
    }

    /**
     * Start the BoxLang miniserver
     */
    start() {
        console.log( "Starting BoxLang mini server..." );
        console.log( `Using ${this.miniserverCommand.type} miniserver: ${this.miniserverCommand.command}` );

        // Check if server is already running
        if ( this.isRunning() ) {
            console.log( "BoxLang server is already running" );
            return;
        }

        // Show indeterminate progress bar while server is starting
        this.setProgressBar( 2 );
        this.setDockBadge( '…' );

        const { projectRoot, serverDebugMode, path } = this.globalSettings;

        // Resolve server settings from miniserver.json (with fallbacks)
        const serverPort   = this.miniserverConfig.port      ?? 59700;
        const serverHost   = this.miniserverConfig.host      ?? '127.0.0.1';
        const rewrites     = this.miniserverConfig.rewrites  !== false;
        const debugMode    = this.miniserverConfig.debug     || serverDebugMode;
        const webroot      = path.resolve( projectRoot, this.miniserverConfig.webroot      ?? '.' );
        const serverHome   = path.resolve( projectRoot, this.miniserverConfig.serverHome   ?? '.miniserver/.boxlang' );

        // Prepare spawn options
        const spawnOptions = {
            cwd: projectRoot,
            detached: false,
            shell: false,
            windowsHide: true,
            env: { ...process.env }
        };

        // For packaged miniserver, we need to set up the environment
        if ( this.miniserverCommand.type === 'packaged' ) {
            const libPath = path.join( projectRoot, '.miniserver', 'lib' );

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
            // Command Arguments — all settings driven by miniserver.json
            [
                // Port
                "-p",
                serverPort.toString(),
                // Debug mode (enabled when miniserver.json debug=true or in development)
                debugMode ? "--debug" : "",
                // Enable URL rewrites
                rewrites ? "--rewrites" : "",
                // Bind locally only — this is a desktop app
                "--host",
                serverHost,
                // Webroot
                "-w",
                webroot,
                // BoxLang runtime home (logs, compiled classes, etc.)
                "--serverHome",
                serverHome
            ].filter( Boolean ), // Remove empty strings
            // Spawn Options
            spawnOptions
        );

        // Handle stderr
        this.process.stderr.on( "data", ( data ) => {
            console.error( `BoxLang Error: ${data}` );
            // Show error notification
            if ( this.mainWindow && !this.mainWindow.isDestroyed() ) {
                this.mainWindow.webContents.executeJavaScript(
                    `console.error('BoxLang Server Error: ${data.toString().replace( /'/g, "\\'" )}')`
                );
            }
        } );

        // Handle process close
        this.process.on( "close", ( code ) => {
            console.log( `BoxLang process exited with code ${code}` );

            // Clear progress bar and dock badge on exit
            this.setProgressBar( -1 );
            this.setDockBadge( '' );

            // Notify about status change
            if ( this.updateCallback ) {
                this.updateCallback();
            }

            // Auto-restart on unexpected exit (not during app shutdown)
            if ( !this.isQuitting && code !== 0 ) {
                console.log( "BoxLang server crashed, attempting restart in 5 seconds..." );
                this.notify(
                    'BoxLang Server Crashed',
                    `Server stopped unexpectedly (code ${code}). Restarting in 5 seconds…`
                );
                this.requestAttention( 'critical' );
                setTimeout( () => {
                    if ( !this.isQuitting ) {
                        this.start();
                    }
                }, 5000 );
            }
        } );

        // Handle process error
        this.process.on( "error", ( error ) => {
            console.error( "Failed to start BoxLang server:", error );

            let errorMessage = `Failed to start BoxLang server: ${error.message}\n\n`;

            if ( this.miniserverCommand.type === 'global' ) {
                errorMessage += `Using global BoxLang MiniServer command: ${this.miniserverCommand.command}\n\n`;
                errorMessage += `Solutions:\n`;
                errorMessage += `1. Install BoxLang globally or ensure it's in your PATH\n`;
                errorMessage += `2. Package miniserver locally by running: boxlang .miniserver/Package.bx\n`;
                errorMessage += `3. Or download manually and run the packager`;
            } else {
                errorMessage += `Using packaged BoxLang MiniServer: ${this.miniserverCommand.command}\n\n`;
                errorMessage += `The packaged miniserver may be corrupted. Try:\n`;
                errorMessage += `1. Re-run: boxlang .miniserver/Package.bx --force\n`;
                errorMessage += `2. Check file permissions on the executable`;
            }

            // Show error dialog
            dialog.showErrorBox(
                "Server Startup Error",
                errorMessage
            );
        } );

        // Handle stdout for server ready detection (bound once so it can be removed)
        this._onStdout = ( message ) => this.checkServerReady( message );
        this.process.stdout.on( 'data', this._onStdout );

        // Update status after a delay
        setTimeout( () => {
            if ( this.updateCallback ) {
                this.updateCallback();
            }
        }, 1000 );
    }

    /**
     * Stop the BoxLang miniserver
     * @param {string} signal - The signal to send (default: SIGTERM)
     */
    stop( signal = 'SIGTERM' ) {
        if ( this.isRunning() ) {
            try {
                this.process.kill( signal );
            } catch {
                console.warn( "BoxLang process already killed." );
            }
        }
    }

    /**
     * Restart the BoxLang server
     */
    restart() {
        console.log( "Restarting BoxLang server..." );
        this.notify( 'BoxLang Server', 'Restarting server…' );
        this.stop();

        // Notify about status change
        if ( this.updateCallback ) {
            this.updateCallback();
        }

        setTimeout( () => {
            this.start();
        }, 2000 );
    }

    /**
     * Check if the server is ready and load the main page
     * @param {Buffer} message - The message from the server
     */
    checkServerReady( message ) {
        if ( message.toString().includes( "BoxLang MiniServer started" ) ) {
            const serverPort = this.miniserverConfig.port ?? this.globalSettings.serverPort;
            // Server is up — clear progress indicators and notify
            this.setProgressBar( -1 );
            this.setDockBadge( '' );
            this.notify(
                'BoxLang Server Started',
                `Server is running on port ${serverPort}`
            );

            const loadPage = () => {
                if ( this.mainWindow ) {
                    this.mainWindow.loadURL( `http://localhost:${serverPort}/` );
                }
            };

            setTimeout( () => {
                loadPage();
            }, 1000 );

            if ( this.mainWindow ) {
                this.mainWindow.webContents.once( "did-finish-load", () => {
                    console.log( "Page loaded successfully." );
                } );

                this.mainWindow.webContents.once( "did-fail-load", () => {
                    setTimeout( () => {
                        loadPage();
                        console.log( "Retrying to load the page..." );
                    }, 1000 );
                } );
            }

            // Detach the stdout listener — it's no longer needed after first start
            if ( this._onStdout ) {
                this.process.stdout.removeListener( "data", this._onStdout );
                this._onStdout = null;
            }
        }
    }

    /**
     * Get server status text
     * @returns {string} Status text
     */
    getStatus() {
        return this.isRunning() ? 'Running' : 'Stopped';
    }

    /**
     * Get miniserver information
     * @returns {Object} Miniserver info
     */
    getMiniServerInfo() {
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
    hasPackagedMiniServer() {
        const { projectRoot, path } = this.globalSettings;
        const packagedCommand = process.platform === 'win32'
            ? path.join( projectRoot, '.miniserver', 'bin', 'boxlang-miniserver.bat' )
            : path.join( projectRoot, '.miniserver', 'bin', 'boxlang-miniserver' );
        return existsSync( packagedCommand );
    }
}
