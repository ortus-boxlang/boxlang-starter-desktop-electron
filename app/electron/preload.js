/* eslint-disable no-unused-vars */
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

const { contextBridge, ipcRenderer } = require( 'electron' );

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object.
contextBridge.exposeInMainWorld( 'boxlangStarterAPI', {

	/**
	 * Opens a native file or directory picker dialog.
	 *
	 * @param {object} options - Picker configuration
	 * @param {string} [options.mode='file'] - 'file' or 'directory'
	 * @param {string} [options.title='Choose a path'] - Dialog title
	 * @param {Array}  [options.filters] - File filters (e.g., [{ name: 'Images', extensions: ['jpg','png'] }])
	 *
	 * @returns {object} Result with `canceled` (boolean) and `path` (string, empty if canceled)
	 */
	pickPath: ( options ) => ipcRenderer.invoke( 'boxlang-starter:pick-path', options ),

	/**
	 * Opens a file/folder path in the native OS file explorer.
	 *
	 * @param {string} pathToOpen - Absolute path to open
	 *
	 * @returns {object} Result with `success` (boolean) and optional `error`
	 */
	openPath: ( pathToOpen ) => ipcRenderer.invoke( 'boxlang-starter:open-path', { path: pathToOpen } ),

	/**
	 * Opens a URL in the default browser (validated to http/https only).
	 *
	 * @param {string} url - URL to open
	 *
	 * @returns {object} Result with `success` (boolean) and optional `error`
	 */
	openExternal: ( url ) => ipcRenderer.invoke( 'boxlang-starter:open-external', { url } ),

	/**
	 * Registers a listener for the "open home" IPC event.
	 * Triggered by keyboard shortcut (CmdOrCtrl+.) or menu action.
	 *
	 * @param {Function} callback - Called with no arguments when the event fires.
	 */
	onOpenHome: ( callback ) => ipcRenderer.on( 'open-home', ( _event, ...args ) => callback( ...args ) ),

	/**
	 * Registers a listener for the "open settings" IPC event.
	 * Triggered by keyboard shortcut (CmdOrCtrl+,) or menu action.
	 *
	 * @param {Function} callback - Called with no arguments when the event fires.
	 */
	onOpenSettings: ( callback ) => ipcRenderer.on( 'open-settings', ( _event, ...args ) => callback( ...args ) ),

	/**
	 * Registers a listener for the "toggle terminal" IPC event.
	 * Triggered by keyboard shortcut (CmdOrCtrl+`) or menu action.
	 *
	 * @param {Function} callback - Called with no arguments when the event fires.
	 */
	onToggleTerminal: ( callback ) => ipcRenderer.on( 'toggle-terminal', ( _event, ...args ) => callback( ...args ) ),

	/**
	 * Registers a listener for the "toggle theme" IPC event.
	 * Triggered by keyboard shortcut (CmdOrCtrl+Shift+L) or menu action.
	 *
	 * @param {Function} callback - Called with no arguments when the event fires.
	 */
	onToggleTheme: ( callback ) => ipcRenderer.on( 'toggle-theme', ( _event, ...args ) => callback( ...args ) )
} );
