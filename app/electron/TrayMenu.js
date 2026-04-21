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
import { Tray, Menu, nativeImage, shell } from 'electron';

/**
 * TrayMenu class - Manages system tray functionality
 */
export class TrayMenu {
    constructor( globalSettings ) {
        this.globalSettings = globalSettings;
        this.tray = null;
        this.boxLang = null;
        this.mainWindow = null;
        this.appIsQuitting = false;
    }

    /**
     * Set references to external components
     */
    setReferences( { boxLang, mainWindow, appIsQuitting } ) {
        this.boxLang = boxLang;
        this.mainWindow = mainWindow;
        this.appIsQuitting = appIsQuitting;
    }

    /**
     * Create system tray
     */
    create( callbacks = {} ) {
        // Use a smaller icon for the tray (16x16 is typical)
        const trayIcon = nativeImage.createFromPath( this.resolveAsset( 'public', 'includes', 'icon.iconset', 'icon_16x16.png' ) );

        if ( trayIcon.isEmpty() ) {
            // Fallback if the specific tray icon doesn't exist
            return;
        }

        this.tray = new Tray( trayIcon );

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
                label: `Server Status: ${this.boxLang && this.boxLang.isRunning() ? 'Running' : 'Stopped'}`,
                enabled: false
            },
            {
                label: 'Restart BoxLang Server',
                click: () => callbacks.restartBoxLang?.()
            },
            { type: 'separator' },
            {
                label: 'Open in Browser',
                click: () => shell.openExternal( `http://localhost:${this.globalSettings.serverPort}` )
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    callbacks.quit?.();
                }
            }
        ] );

        this.tray.setContextMenu( contextMenu );
        this.tray.setToolTip( `${this.globalSettings.appName} - Port: ${this.globalSettings.serverPort}` );

        // Click to show/hide window
        this.tray.on( 'click', () => {
            if ( this.mainWindow ) {
                if ( this.mainWindow.isVisible() && this.mainWindow.isFocused() ) {
                    this.mainWindow.hide();
                } else {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }
            }
        } );

        return this.tray;
    }

    /**
     * Update tray context menu with current server status
     */
    updateMenu( callbacks = {} ) {
        if ( !this.tray ) return;

        const isRunning = this.boxLang && this.boxLang.isRunning();
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
                label: 'Open in Browser',
                click: () => shell.openExternal( `http://localhost:${this.globalSettings.serverPort}` )
            },
            { type: 'separator' },
            {
                label: `Server Status: ${isRunning ? 'Running' : 'Stopped'}`,
                enabled: false
            },
            {
                label: 'Restart Server',
                click: () => callbacks.restartBoxLang?.()
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    callbacks.quit?.();
                }
            }
        ] );
        this.tray.setContextMenu( contextMenu );
    }

    /**
     * Whether a tray instance currently exists
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
