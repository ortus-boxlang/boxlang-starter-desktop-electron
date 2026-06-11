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
import { Tray, Menu, nativeImage } from 'electron';

/**
 * TrayMenu class - Manages system tray functionality
 */
export class TrayMenu {

	/**
	 * Constructor for TrayMenu
	 *
	 * @param {*} globalSettings - Global settings for the application
	 */
    constructor( globalSettings ) {
        this.globalSettings = globalSettings;
        this.tray = null;
        this.mainWindow = null;
    }

    /**
     * Set references to external components
     *
     * @param {Object} references - An object containing references to external components
     * @param {BrowserWindow} references.mainWindow - Reference to the main application window
     */
    setReferences( { mainWindow } ) {
        this.mainWindow = mainWindow;
    }

    /**
     * Create system tray
     */
    create( callbacks = {} ) {
		// Create the Tray instance with the application icon
        this.tray = new Tray(
			nativeImage.createFromPath( this.resolveAsset( 'public', 'includes', 'icon.iconset', 'icon_16x16.png' ) )
		 );

		 // Build the context menu for the tray
        const contextMenu = Menu.buildFromTemplate( [
            {
                label: 'Show Application',
                click: () => {
                    if ( this.mainWindow ) {
                        this.mainWindow.show();
                        this.mainWindow.focus();
                    } else {
                        callbacks.createWindow?.();
                    }
                }
            },
            {
                label: 'Hide Application',
                click: () => {
                    if ( this.mainWindow ) {
                        this.mainWindow.hide();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    callbacks.quit?.();
                }
            }
        ] );

		// Set the context menu for the tray
        this.tray.setContextMenu( contextMenu );
		this.tray.setToolTip( `${this.globalSettings.appName}` );

        // Click to show/hide window if you click the tray icon directly
        this.tray.on( 'click', () => {
            if ( this.mainWindow ) {
                if ( !this.mainWindow.isVisible() || !this.mainWindow.isFocused() ) {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }
            }
        } );

        return this.tray;
    }

    /**
     * Whether a tray instance currently exists
	 *
     * @returns {boolean}
     */
    hasTray() {
        return this.tray !== null;
    }

    /**
     * Destroy the tray
     */
    destroy() {
        if ( this.tray ) {
            this.tray.destroy();
            this.tray = null;
        }
    }

    /**
     *  Resolve the path to an asset
     *
     * @param  {...any} p Path parts to the asset
     *
     * @returns {string} The resolved path
     */
    resolveAsset( ...p ) {
        return this.globalSettings.path.join( this.globalSettings.projectRoot, ...p );
    }
}
