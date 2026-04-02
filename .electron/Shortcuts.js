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

        // Quick restart BoxLang server (CmdOrCtrl+Shift+B to avoid conflict with Force Reload)
        globalShortcut.register( 'CommandOrControl+Shift+B', () => {
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
