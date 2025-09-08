import { spawn } from "child_process";
import { dialog } from "electron";

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
    }

    /**
     * Set external references
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

        // Check if server is already running
        if ( this.isRunning() ) {
            console.log( "BoxLang server is already running" );
            return;
        }

        const { projectRoot, serverPort, serverDebugMode } = this.globalSettings;
        const path = this.globalSettings.path;

        // Start up the boxlang mini server
        this.process = spawn(
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
            {
                cwd: projectRoot,
                detached: false,
                shell: false,
                windowsHide: true,
                env: process.env
            }
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

            // Notify about status change
            if ( this.updateCallback ) {
                this.updateCallback();
            }

            // Auto-restart on unexpected exit (not during app shutdown)
            if ( !this.isQuitting && code !== 0 ) {
                console.log( "BoxLang server crashed, attempting restart in 5 seconds..." );
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

            // Show error dialog
            dialog.showErrorBox(
                "Server Startup Error",
                `Failed to start BoxLang server: ${error.message}\n\nPlease ensure BoxLang MiniServer is installed and in your PATH.`
            );
        } );

        // Handle stdout for server ready detection
        this.process.stdout.on( 'data', ( message ) => {
            this.checkServerReady( message );
        } );

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
            const loadPage = () => {
                if ( this.mainWindow ) {
                    this.mainWindow.loadURL( `http://localhost:${this.globalSettings.serverPort}/` );
                }
            };

            setTimeout( () => {
                loadPage();
            }, 1000 );

            if ( this.mainWindow ) {
                this.mainWindow.webContents.on( "did-finish-load", () => {
                    console.log( "Page loaded successfully." );
                } );

                this.mainWindow.webContents.on( "did-fail-load", () => {
                    setTimeout( () => {
                        loadPage();
                        console.log( "Retrying to load the page..." );
                    }, 1000 );
                } );
            }

            // Remove the listener after first successful start
            this.process.stdout.removeListener( "data", ( message ) => {
                this.checkServerReady( message );
            } );
        }
    }

    /**
     * Get server status text
     * @returns {string} Status text
     */
    getStatus() {
        return this.isRunning() ? 'Running' : 'Stopped';
    }
}
