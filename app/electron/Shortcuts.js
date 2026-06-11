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
import { globalShortcut } from 'electron';

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
    setReferences ( { mainWindow } ) {
        this.mainWindow = mainWindow;
    }

    /**
     * Register global shortcuts
     */
	register ( callbacks = {} ) {
		const isMac = process.platform === 'darwin';

		// Open DevTools (platform-aware accelerator)
		globalShortcut.register( isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I', () => {
			if ( this.mainWindow ) {
				this.mainWindow.webContents.send( 'open-devtools' );
			}
		} );

		// Open settings panel (CmdOrCtrl+,)
		globalShortcut.register( 'CommandOrControl+,', () => {
			if ( this.mainWindow ) {
				this.mainWindow.webContents.send( 'open-settings' );
			}
		} );

		// Navigate to dashboard/home (CmdOrCtrl+.)
		globalShortcut.register( 'CommandOrControl+.', () => {
			if ( this.mainWindow ) {
				this.mainWindow.webContents.send( 'open-home' );
			}
		} );

		// Toggle terminal panel (CmdOrCtrl+`)
		globalShortcut.register( 'CommandOrControl+`', () => {
			if ( this.mainWindow ) {
				this.mainWindow.webContents.send( 'toggle-terminal' );
			}
		} );

		// Toggle dark/light mode (CmdOrCtrl+Shift+L)
		globalShortcut.register( 'CommandOrControl+Shift+L', () => {
			if ( this.mainWindow ) {
				this.mainWindow.webContents.send( 'toggle-theme' );
			}
		} );

		// Restart BoxLang (CmdOrCtrl+Shift+R)
		if ( callbacks.restartBoxLang ) {
			globalShortcut.register( 'CommandOrControl+Shift+R', () => {
				callbacks.restartBoxLang();
			} );
		}
	}

    /**
     * Unregister all global shortcuts
     */
    unregister () {
        globalShortcut.unregisterAll();
    }
}
