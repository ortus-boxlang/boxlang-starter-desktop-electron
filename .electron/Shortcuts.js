import { globalShortcut, shell } from 'electron';

/**
 * Shortcuts class - Manages global keyboard shortcuts
 */
export class Shortcuts {
    constructor( globalSettings ) {
        this.globalSettings = globalSettings;
        this.mainWindow = null;
    }

    /**
     * Set references to external components
     */
    setReferences( { mainWindow } ) {
        this.mainWindow = mainWindow;
    }

    /**
     * Register global shortcuts
     */
    register( callbacks = {} ) {
        // Quick show/hide application
        globalShortcut.register( 'CommandOrControl+Shift+L', () => {
            if ( this.mainWindow ) {
                if ( this.mainWindow.isVisible() && this.mainWindow.isFocused() ) {
                    this.mainWindow.hide();
                } else {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }
            }
        } );

        // Quick restart BoxLang server
        globalShortcut.register( 'CommandOrControl+Shift+R', () => {
            callbacks.restartBoxLang?.();
        } );

        // Open application in browser
        globalShortcut.register( 'CommandOrControl+Shift+O', () => {
            shell.openExternal( `http://localhost:${this.globalSettings.serverPort}` );
        } );
    }

    /**
     * Unregister all global shortcuts
     */
    unregister() {
        globalShortcut.unregisterAll();
    }
}
