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
import { Menu, shell, dialog, app } from 'electron';

/**
 * AppMenu class - Manages application menu functionality
 */
export class AppMenu {
    constructor( globalSettings ) {
        this.globalSettings = globalSettings;
    }

    /**
     * Create the application menu
     */
    create( callbacks = {} ) {
        const isMac = process.platform === 'darwin';

        const template = [
            // macOS app menu (first menu)
            ...(isMac ? [{
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    {
                        label: 'Quit ' + app.getName(),
                        accelerator: 'Cmd+Q',
                        click: () => {
                            callbacks.quit?.();
                        }
                    }
                ]
            }] : []),
            {
                label: 'File',
                submenu: [
                    {
                        label: 'New Window',
                        accelerator: 'CmdOrCtrl+N',
                        click: () => {
                            callbacks.showOrCreateWindow?.();
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Reload',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => {
                            callbacks.reloadWindow?.();
                        }
                    },
                    {
                        label: 'Force Reload',
                        accelerator: 'CmdOrCtrl+Shift+R',
                        click: () => {
                            callbacks.forceReloadWindow?.();
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Restart BoxLang Server',
                        accelerator: 'CmdOrCtrl+Shift+B',
                        click: () => callbacks.restartBoxLang?.()
                    },
                    { type: 'separator' },
                    // On non-Mac, put Quit in File menu
                    ...(!isMac ? [{
                        label: 'Quit',
                        accelerator: 'Ctrl+Q',
                        click: () => {
                            callbacks.quit?.();
                        }
                    }] : [{
                        label: 'Close Window',
                        accelerator: 'Cmd+W',
                        click: () => callbacks.closeWindow?.()
                    }])
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'resetzoom' },
                    { role: 'zoomin' },
                    { role: 'zoomout' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' },
                    {
                        label: 'Toggle Developer Tools',
                        accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                        click: () => {
                            callbacks.toggleDevTools?.();
                        }
                    }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    ...( process.platform === 'darwin' ? [
                        { role: 'close' },
                        { role: 'zoom' },
                        { type: 'separator' },
                        { role: 'front' }
                    ] : [
                        { role: 'close' }
                    ] )
                ]
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About ' + app.getName(),
                        click: () => callbacks.showAbout?.()
                    },
                    {
                        label: "BoxLang Website",
                        click: () => shell.openExternal( 'https://www.boxlang.io' )
                    },
                    {
                        label: 'BoxLang Documentation',
                        click: () => shell.openExternal( 'https://boxlang.ortusbooks.com' )
                    },
                    {
                        label: 'BoxLang Support',
                        click: () => shell.openExternal( 'https://www.boxlang.io/plans' )
                    },
                    {
                        label: 'BoxLang Slack',
                        click: () => shell.openExternal( 'https://boxteam.ortussolutions.com' )
                    },
                    {
                        label: 'BoxLang Community',
                        click: () => shell.openExternal( 'https://community.ortussolutions.com' )
                    },
                    {
                        label: 'Report Issue',
                        click: () => shell.openExternal( 'https://github.com/ortus-boxlang/boxlang/issues' )
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate( template );
        Menu.setApplicationMenu( menu );

        return menu;
    }
}
