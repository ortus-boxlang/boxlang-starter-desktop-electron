// Import styles
import '../scss/app.scss';

// Import Bootstrap JS
import * as Bootstrap from 'bootstrap';

// Import Alpine.js
import Alpine from 'alpinejs';

// Import Alpine.js store
import ModalStore from "./stores/modal-store.js";

// Initialize Alpine.js stores
document.addEventListener( "alpine:init", () => {
    Alpine.store( "modal", ModalStore );
} );

// Start Alpine.js
window.Alpine = Alpine;
Alpine.start();

// Application initialization
document.addEventListener( "DOMContentLoaded", () => {
    console.log( "BoxLang Electron App initialized" );

    // Add any app-specific initialization here
} );

// Hot module replacement for development
if ( import.meta.hot ) {
    import.meta.hot.accept();
}